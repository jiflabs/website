import CleanCSS from "clean-css";
import matter from "gray-matter";
import hljs from "highlight.js";
import { parse, Renderer } from "marked";
import fs from "node:fs";
import path from "node:path";
import { minify as terserMinifyJS } from "terser";
import { minify as terserMinifyHTML } from "html-minifier-terser";
import ts from "typescript";
import yaml from "yaml";

/**
 * @typedef {{ srcDir: string, dstDir: string, debug: boolean }} Config
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
 * @param {Config} config
 * @param {string} srcPath
 * @param {string} dstPath
 */
async function processJS(config, srcPath, dstPath) {
    const input = readFile(srcPath);

    try {
        const result = await terserMinifyJS(input, {
            compress: true,
        });

        writeFile(dstPath, result.code);
    } catch (error) {
        console.error("In file %s: %s", srcPath, error);
    }
}

/**
 * @param {Config} config
 * @param {string} srcPath
 * @param {string} dstPath
 */
async function processCSS(config, srcPath, dstPath) {
    const input = readFile(srcPath);
    const result = new CleanCSS().minify(input);

    for (const message of result.errors) {
        console.error("In file %s: %s", srcPath, message);
    }

    for (const message of result.warnings) {
        console.warn("In file %s: %s", srcPath, message);
    }

    writeFile(dstPath, result.styles);
}

/**
 * @param {Config} config
 * @param {string} srcPath
 * @param {string} dstPath
 */
async function processHTML(config, srcPath, dstPath) {
    const input = readFile(srcPath);

    try {
        const result = await terserMinifyHTML(input, {
            collapseWhitespace: true,
            removeComments: true,
        });

        writeFile(dstPath, result);
    } catch (error) {
        console.error("In file %s: %s", srcPath, error);
    }
}

/**
 * @param {Config} config
 * @param {string} srcPath
 * @param {string} dstPath
 */
async function processTS(config, srcPath, dstPath) {
    const input = readFile(srcPath);
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

    for (const diagnostic of result.diagnostics) {
        switch (diagnostic.category) {
            case ts.DiagnosticCategory.Message:
            case ts.DiagnosticCategory.Suggestion:
                console.log("In file %s: %s", diagnostic.messageText);
                break;
            case ts.DiagnosticCategory.Warning:
                console.warn("In file %s: %s", diagnostic.messageText);
                break;
            case ts.DiagnosticCategory.Error:
                console.error("In file %s: %s", diagnostic.messageText);
                break;
        }
    }

    const output = result.outputText;
    const outputPath = dstPath.replace(/\.ts$/, ".js");

    try {
        const result = await terserMinifyJS(output, {
            compress: true,
        });

        writeFile(outputPath, result.code);
    } catch (error) {
        console.error("In file %s: %s", srcPath, error);

        writeFile(outputPath, output);
    }

    if (config.debug) {
        writeFile(`${outputPath}.map`, result.sourceMapText);
        fs.copyFileSync(srcPath, dstPath);
    }
}

/**
 * @param {Config} config
 * @param {string} srcPath
 * @param {string} dstPath
 */
async function processMD(config, srcPath, dstPath) {
    const input = readFile(srcPath);

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
}

/**
 * @type {Record<string, (config: Config, srcPath: string, dstPath: string) => (void | Promise<void>)>}
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
        process[extname](config, srcPath, dstPath);
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
