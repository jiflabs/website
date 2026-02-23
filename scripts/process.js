import matter from "gray-matter";
import hljs from "highlight.js";
import { parse, Renderer } from "marked";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import yaml from "yaml";

function createDefineDebugTransformer(debug) {
    return (context) => {
        const visitor = (node) => {
            if (ts.isIdentifier(node) && node.text === "__DEBUG__") {
                return debug ? ts.factory.createTrue() : ts.factory.createFalse();
            }
            return ts.visitEachChild(node, visitor, context);
        };

        return (node) => ts.visitNode(node, visitor);
    };
}

/**
 * @param {string} template_path
 * @param {Record<string, unknown>} global
 * @param {Record<string, unknown>} data
 * @param {string} content
 */
function instantiate(template_path, global, data, content) {
    let template = fs.readFileSync(template_path, "utf-8");

    template = template.replaceAll("%content%", content);

    for (const key in global) {
        template = template.replaceAll(`%global.${key}%`, global[key]);
    }

    for (const key in data) {
        template = template.replaceAll(`%data.${key}%`, data[key]);
    }

    return template;
}

/**
 * @param {string} src_dir
 * @param {string} dst_dir
 * @param {string} src_path
 * @param {boolean?} debug
 */
export function processFile(src_dir, dst_dir, src_path, debug) {
    const global = (() => {
        const input = fs.readFileSync(path.join(src_dir, "config.yaml"), "utf-8");
        return yaml.parse(input);
    })();

    const rel_path = path.relative(src_dir, src_path);
    const dst_path = path.join(dst_dir, rel_path);

    const src = fs.statSync(src_path);

    if (src.isDirectory()) {
        fs.mkdirSync(dst_path, { recursive: true });
        fs.readdirSync(src_path).forEach((file) => processFile(src_dir, dst_dir, path.join(src_path, file), debug));
        return;
    }

    if (!src.isFile()) {
        throw new Error("Path must either point to a file or directory.");
    }

    switch (path.extname(src_path)) {
        case ".ts": {
            const input = fs.readFileSync(src_path, "utf-8");
            const result = ts.transpileModule(input, {
                compilerOptions: {
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.ES2020,
                    moduleDetection: ts.ModuleDetectionKind.Force,
                    moduleResolution: ts.ModuleResolutionKind.Bundler,
                    esModuleInterop: false,
                    isolatedModules: true,
                    sourceMap: debug ?? false,
                    strict: true,
                },
                transformers: {
                    before: [createDefineDebugTransformer(debug)],
                },
                fileName: src_path,
            });

            const output_path = dst_path.replace(/\.ts$/, ".js");
            fs.writeFileSync(output_path, result.outputText, "utf-8");

            if (debug) {
                fs.writeFileSync(`${output_path}.map`, result.sourceMapText, "utf-8");
                fs.copyFileSync(src_path, dst_path);
            }
            break;
        }

        case ".md": {
            const input = fs.readFileSync(src_path, "utf-8");

            const { data, content } = matter(input);

            const renderer = new Renderer();

            renderer.code = ({ text, lang }) => {
                const valid = lang && hljs.getLanguage(lang);
                const code = valid ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;

                return `<pre><code class="hljs ${lang ?? ""}">${code}</code></pre>`;
            };
            renderer.code = renderer.code.bind(renderer);

            const html = parse(content, { async: false, renderer });

            const template = data.template;

            const template_path = path.join(src_dir, "templates", `${template}.html`);
            const output = instantiate(template_path, global, data, html);

            const output_path = dst_path.replace(/\.md$/, ".html");
            fs.writeFileSync(output_path, output, "utf-8");
            break;
        }

        default:
            fs.copyFileSync(src_path, dst_path);
            break;
    }
}

/**
 * @param {string} src_dir
 * @param {string} dst_dir
 * @param {boolean?} debug
 */
export function processAll(src_dir, dst_dir, debug) {
    if (fs.existsSync(dst_dir)) {
        fs.rmSync(dst_dir, { recursive: true, force: true });
    }

    processFile(src_dir, dst_dir, src_dir, debug);
}
