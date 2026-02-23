import matter from "gray-matter";
import hljs from "highlight.js";
import { parse, Renderer } from "marked";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import yaml from "yaml";

/**
 * @typedef {{ srcDir: string, dstDir: string, debug: boolean }} Config
 */

/**
 * @param {boolean} debug
 * @returns {ts.CustomTransformerFactory}
 */
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
 * @param {string} templatePath
 * @param {Record<string, unknown>} global
 * @param {Record<string, unknown>} data
 * @param {string} content
 */
function instantiate(templatePath, global, data, content) {
    let template = fs.readFileSync(templatePath, "utf-8");

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
 * @param {Config} config
 * @param {string} srcPath
 */
export function processFile(config, srcPath) {
    const global = (() => {
        const input = fs.readFileSync(path.join(config.srcDir, "config.yaml"), "utf-8");
        return yaml.parse(input);
    })();

    const relPath = path.relative(config.srcDir, srcPath);
    const dstPath = path.join(config.dstDir, relPath);

    const src = fs.statSync(srcPath);

    if (src.isDirectory()) {
        fs.mkdirSync(dstPath, { recursive: true });
        fs.readdirSync(srcPath).forEach((file) => processFile(config, path.join(srcPath, file)));
        return;
    }

    if (!src.isFile()) {
        throw new Error("Path must either point to a file or directory.");
    }

    switch (path.extname(srcPath)) {
        case ".ts": {
            const input = fs.readFileSync(srcPath, "utf-8");
            const result = ts.transpileModule(input, {
                compilerOptions: {
                    target: ts.ScriptTarget.ES2020,
                    module: ts.ModuleKind.ES2020,
                    moduleDetection: ts.ModuleDetectionKind.Force,
                    moduleResolution: ts.ModuleResolutionKind.Bundler,
                    esModuleInterop: false,
                    isolatedModules: true,
                    sourceMap: config.debug ?? false,
                    strict: true,
                },
                transformers: {
                    before: [createDefineDebugTransformer(config.debug)],
                },
                fileName: srcPath,
            });

            const outputPath = dstPath.replace(/\.ts$/, ".js");
            fs.writeFileSync(outputPath, result.outputText, "utf-8");

            if (config.debug) {
                fs.writeFileSync(`${outputPath}.map`, result.sourceMapText, "utf-8");
                fs.copyFileSync(srcPath, dstPath);
            }
            break;
        }

        case ".md": {
            const input = fs.readFileSync(srcPath, "utf-8");

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

            const templatePath = path.join(config.srcDir, "templates", `${template}.html`);
            const output = instantiate(templatePath, global, data, html);

            const outputPath = dstPath.replace(/\.md$/, ".html");
            fs.writeFileSync(outputPath, output, "utf-8");
            break;
        }

        default:
            fs.copyFileSync(srcPath, dstPath);
            break;
    }
}

/**
 * @param {Config} config
 */
export function processAll(config) {
    if (fs.existsSync(config.dstDir)) {
        fs.rmSync(config.dstDir, { recursive: true, force: true });
    }

    processFile(config, config.srcDir);
}
