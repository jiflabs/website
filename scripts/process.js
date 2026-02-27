import CleanCSS from "clean-css";
import matter from "gray-matter";
import hljs from "highlight.js";
import { minify as terserMinifyHTML } from "html-minifier-terser";
import { parse, Renderer } from "marked";
import fs from "node:fs";
import path from "node:path";
import { minify as terserMinifyJS } from "terser";
import ts from "typescript";
import yaml from "yaml";

/**
 * @typedef {{ srcDir: string, dstDir: string, debug: boolean }} Config
 * @typedef {{ dirname?: string, basename: string, content: string }} FileReference
 * @typedef {(config: Config, ref: FileReference) => Promise<FileReference[]>} Processor
 */

/**
 * @param {string} path
 * @returns {string}
 */
const readFile = (path) => fs.readFileSync(path, "utf-8");

/**
 * @param {string} path
 * @param {string} data
 * @returns {void}
 */
const writeFile = (path, data) => fs.writeFileSync(path, data, "utf-8");

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
function instantiateTemplate(templatePath, global, data, content) {
    let template = readFile(templatePath);

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
 * @param {FileReference} ref
 */
function refPath(ref) {
    return path.join(ref.dirname, ref.basename);
}

/**
 * @type {Processor}
 */
const processJS = async (config, ref) => {
    try {
        const result = await terserMinifyJS(ref.content, {
            compress: true,
            mangle: {},
        });

        return [{ basename: ref.basename, content: result.code }];
    } catch (error) {
        console.error("In file %s: %s", refPath(ref), error);
        return [ref];
    }
};

/**
 * @type {Processor}
 */
const processCSS = async (config, ref) => {
    const result = new CleanCSS().minify(ref.content);

    for (const message of result.errors) {
        console.error("In file %s: %s", refPath(ref), message);
    }

    for (const message of result.warnings) {
        console.warn("In file %s: %s", refPath(ref), message);
    }

    return [{ basename: ref.basename, content: result.styles }];
};

/**
 * @type {Processor}
 */
const processHTML = async (config, ref) => {
    try {
        const result = await terserMinifyHTML(ref.content, {
            collapseWhitespace: true,
            removeComments: true,
        });

        return [{ basename: ref.basename, content: result }];
    } catch (error) {
        console.error("In file %s: %s", refPath(ref), error);
        return [{ basename: ref.basename, content: ref.content }];
    }
};

/**
 * @type {Processor}
 */
const processTS = async (config, ref) => {
    const result = ts.transpileModule(ref.content, {
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
        fileName: refPath(ref),
    });

    for (const diagnostic of result.diagnostics) {
        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Message:
            case ts.DiagnosticCategory.Suggestion:
                console.log("In file %s: %s", refPath(ref), diagnostic.messageText);
                break;
            case ts.DiagnosticCategory.Warning:
                console.warn("In file %s: %s", refPath(ref), diagnostic.messageText);
                break;
            case ts.DiagnosticCategory.Error:
                console.error("In file %s: %s", refPath(ref), diagnostic.messageText);
                break;
        }
    }

    const outputBasename = ref.basename.replace(/\.ts$/, ".js");

    const refs = process[".js"](config, { basename: outputBasename, content: result.outputText });

    if (config.debug) {
        return [
            ...refs,
            { basename: `${outputBasename}.map`, content: result.sourceMapText },
            { basename: ref.basename, content: ref.content },
        ];
    }

    return refs;
};

/**
 * @type {Processor}
 */
const processMD = async (config, ref) => {
    const input = ref.content;

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

    const global = (() => {
        const input = readFile(path.join(config.srcDir, "config.yaml"));
        return yaml.parse(input);
    })();

    const output = instantiateTemplate(templatePath, global, data, html);
    const outputPath = dstPath.replace(/\.md$/, ".html");

    try {
        const result = await terserMinifyHTML(output, {
            collapseWhitespace: true,
            removeComments: true,
        });

        writeFile(outputPath, result);
    } catch (error) {
        console.error("In file %s: %s", srcPath, error);

        writeFile(outputPath, output);
    }
};

/**
 * @type {Record<string, Processor>}
 */
const process = {
    ".js": processJS,
    ".css": processCSS,
    ".html": processHTML,
    ".ts": processTS,
    ".md": processMD,
};

/**
 * @param {Config} config
 * @param {string} srcPath
 */
export function processFile(config, srcPath) {
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

    const extname = path.extname(srcPath);
    if (extname in process) {
        const input = {
            dirname: path.dirname(srcPath),
            basename: path.basename(srcPath),
            content: readFile(srcPath),
        };

        process[extname](config, input).then((refs) => {
            const dirname = path.dirname(dstPath);
            for (const ref of refs) {
                const filename = path.join(dirname, ref.basename);
                writeFile(filename, ref.content);
            }
        });
    } else {
        fs.copyFileSync(srcPath, dstPath);
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
