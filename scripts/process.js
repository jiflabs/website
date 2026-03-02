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
 * @typedef {{ permanent: boolean, url: string }} ServerRedirect
 * @typedef {{ redirect?: Record<string, ServerRedirect>, global?: Record<string, unknown> }} ServerConfig
 *
 * @typedef {{ srcDir: string, dstDir: string, debug: boolean, global?: Record<string, unknown> }} Context
 * @typedef {{ dirname?: string, basename: string, content: string }} FileReference
 * @typedef {(context: Context, ref: FileReference) => Promise<FileReference[]>} Processor
 */

/**
 * @param {fs.PathLike} path
 */
const readFileSync = (path) => fs.readFileSync(path, "utf-8");

/**
 * @param {fs.PathLike} path
 * @param {string | NodeJS.ArrayBufferView} data
 */
const writeFileSync = (path, data) => fs.writeFileSync(path, data, "utf-8");

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
    let template = readFileSync(templatePath);

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
    if (ref.dirname) {
        return path.join(ref.dirname, ref.basename);
    }
    return ref.basename;
}

/**
 * @type {Processor}
 */
const processJS = async (_context, ref) => {
    try {
        const result = await terserMinifyJS(ref.content, {
            compress: true,
            mangle: {},
            format: {
                comments: /sourceMappingURL/,
            },
        });

        return [{ basename: ref.basename, content: result.code }];
    } catch (error) {
        console.error("In file %s: %s", refPath(ref), error);
        return [{ basename: ref.basename, content: ref.content }];
    }
};

/**
 * @type {Processor}
 */
const processCSS = async (_context, ref) => {
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
const processHTML = async (_context, ref) => {
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
const processTS = async (context, ref) => {
    const result = ts.transpileModule(ref.content, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ES2020,
            moduleDetection: ts.ModuleDetectionKind.Force,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            esModuleInterop: false,
            isolatedModules: true,
            sourceMap: context.debug ?? false,
            strict: true,
        },
        transformers: {
            before: [createDefineDebugTransformer(context.debug)],
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

    const refs = await process[".js"](context, {
        basename: outputBasename,
        dirname: ref.dirname,
        content: result.outputText,
    });

    if (context.debug) {
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
const processMD = async (context, ref) => {
    const { data, content } = matter(ref.content);

    const renderer = new Renderer();

    renderer.code = ({ text, lang }) => {
        const valid = lang && hljs.getLanguage(lang);
        const code = valid ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;

        return `<pre><code class="hljs ${lang ?? ""}">${code}</code></pre>`;
    };
    renderer.code = renderer.code.bind(renderer);

    const html = await parse(content, { async: true, renderer });

    const templatePath = path.join(context.srcDir, "templates", `${data.template}.html`);

    const output = instantiateTemplate(templatePath, context.global ?? {}, data, html);
    const outputBasename = ref.basename.replace(/\.md$/, ".html");

    return process[".html"](context, { basename: outputBasename, dirname: ref.dirname, content: output });
};

/**
 * @type {Processor}
 */
const processYAML = async (_context, ref) => {
    const output = yaml.parse(ref.content);
    const outputBasename = ref.basename.replace(/\.yaml$/, ".json");
    return [{ basename: outputBasename, content: JSON.stringify(output) }];
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
    ".yaml": processYAML,
};

/**
 * @param {Context} context
 * @returns {ServerConfig}
 */
export function processConfig(context) {
    const inputPath = path.join(context.srcDir, "config.yaml");
    const input = readFileSync(inputPath);

    try {
        return yaml.parse(input);
    } catch (error) {
        console.error("In file %s: %s", inputPath, error);
        return {};
    }
}

/**
 * @param {Context} context
 * @param {string} srcPath
 */
export async function processFile(context, srcPath) {
    const relPath = path.relative(context.srcDir, srcPath);
    const dstPath = path.join(context.dstDir, relPath);

    const src = fs.statSync(srcPath);

    if (src.isDirectory()) {
        fs.mkdirSync(dstPath, { recursive: true });

        const files = fs.readdirSync(srcPath);
        for (const file of files) {
            processFile(context, path.join(srcPath, file));
        }
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
            content: readFileSync(srcPath),
        };

        const refs = await process[extname](context, input);

        const dirname = path.dirname(dstPath);
        for (const ref of refs) {
            const filename = path.join(ref.dirname ?? dirname, ref.basename);
            writeFileSync(filename, ref.content);
        }
    } else {
        fs.copyFileSync(srcPath, dstPath);
    }
}

/**
 * @param {Context} context
 */
export async function processAll(context) {
    if (fs.existsSync(context.dstDir)) {
        fs.rmSync(context.dstDir, { recursive: true, force: true });
    }

    return processFile(context, context.srcDir);
}
