import fs from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import hljs from "highlight.js";
import { Renderer, parse } from "marked";

import ts from "typescript";
import yaml from "yaml";
import { minifyCSS, minifyHTML, minifyJS } from "./minify.ts";

interface ServerRedirect {
    permanent: boolean;
    url: string;
}

interface ServerConfig {
    redirect?: Record<string, ServerRedirect>;
    global?: Record<string, string>;
}

interface Context {
    srcDir: string;
    dstDir: string;
    debug: boolean;
    global?: Record<string, string>;
}

interface FileReference {
    dirname?: string;
    basename: string;
    content: string;
}

type Processor = (ref: FileReference, context?: Context) => FileReference[];

const readFileSync = (path: fs.PathLike) => fs.readFileSync(path, "utf-8");

const writeFileSync = (path: fs.PathLike, data: string | NodeJS.ArrayBufferView) =>
    fs.writeFileSync(path, data, "utf-8");

function createDefineDebugTransformer(debug: boolean): ts.TransformerFactory<ts.SourceFile> {
    return (context) => {
        function visit<T extends ts.Node>(node: T): ts.Node | T {
            if (ts.isIdentifier(node) && node.text === "__DEBUG__") {
                return debug ? ts.factory.createTrue() : ts.factory.createFalse();
            }
            return ts.visitEachChild(node, visit, context);
        }

        return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    };
}

function createMinifyTransformer(): ts.TransformerFactory<ts.SourceFile> {
    return (context) => {
        const factory = context.factory;

        function processByTag(tag: "html" | "css", text: string) {
            const input: FileReference = { basename: "inline", content: text };

            let output;
            switch (tag) {
                case "html":
                    output = PROC[".html"](input);
                    break;

                case "css":
                    output = PROC[".css"](input);
                    break;

                default:
                    return text;
            }

            return output[0].content;
        }

        function visit<T extends ts.Node>(node: T): ts.Node | T {
            if (ts.isTaggedTemplateExpression(node)) {
                const tag = node.tag.getText();

                if (tag === "html" || tag === "css") {
                    const template = node.template;

                    if (ts.isNoSubstitutionTemplateLiteral(template)) {
                        const minified = processByTag(tag, template.text);

                        return factory.updateTaggedTemplateExpression(
                            node,
                            node.tag,
                            node.typeArguments,
                            factory.createNoSubstitutionTemplateLiteral(minified),
                        );
                    }

                    if (ts.isTemplateExpression(template)) {
                        const headText = processByTag(tag, template.head.text);
                        const head = factory.createTemplateHead(headText, template.head.rawText);

                        const spans = template.templateSpans.map((span) => {
                            const literal = span.literal;

                            const text = processByTag(tag, literal.text);
                            const raw = literal.rawText;

                            const next = ts.isTemplateMiddle(literal)
                                ? factory.createTemplateMiddle(text, raw)
                                : factory.createTemplateTail(text, raw);

                            return factory.createTemplateSpan(span.expression, next);
                        });

                        const next = factory.createTemplateExpression(head, spans);

                        return factory.updateTaggedTemplateExpression(node, node.tag, node.typeArguments, next);
                    }
                }
            }
            return ts.visitEachChild(node, visit, context);
        }

        return (node) => ts.visitNode(node, visit) as ts.SourceFile;
    };
}

function instantiateTemplate(
    templatePath: string,
    global: Record<string, string>,
    data: Record<string, string>,
    content: string,
) {
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

function refPath(ref: FileReference) {
    if (ref.dirname) {
        return path.join(ref.dirname, ref.basename);
    }
    return ref.basename;
}

const processJS: Processor = (ref) => {
    try {
        const minified = minifyJS(ref.content);
        return [{ basename: ref.basename, content: minified }];
    } catch (error) {
        console.error("In file %s: %s", refPath(ref), error);
        return [{ basename: ref.basename, content: ref.content }];
    }
};

const processCSS: Processor = (ref) => {
    try {
        const minified = minifyCSS(ref.content);
        return [{ basename: ref.basename, content: minified }];
    } catch (error) {
        console.error("In file %s: %s", refPath(ref), error);
        return [{ basename: ref.basename, content: ref.content }];
    }
};

const processHTML: Processor = (ref) => {
    try {
        const minified = minifyHTML(ref.content);
        return [{ basename: ref.basename, content: minified }];
    } catch (error) {
        console.error("In file %s: %s", refPath(ref), error);
        return [{ basename: ref.basename, content: ref.content }];
    }
};

const processTS: Processor = (ref, context) => {
    const result = ts.transpileModule(ref.content, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2020,
            module: ts.ModuleKind.ES2020,
            moduleDetection: ts.ModuleDetectionKind.Force,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            esModuleInterop: false,
            isolatedModules: true,
            sourceMap: context?.debug ?? false,
            strict: true,
        },
        transformers: {
            before: [createDefineDebugTransformer(context?.debug ?? false), createMinifyTransformer()],
        },
        fileName: refPath(ref),
    });

    for (const diagnostic of result.diagnostics ?? []) {
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

    const refs = PROC[".js"]({ basename: outputBasename, content: result.outputText }, context);

    if (context?.debug) {
        return [
            ...refs,
            { basename: `${outputBasename}.map`, content: result.sourceMapText ?? "" },
            { basename: ref.basename, content: ref.content },
        ];
    }

    return refs;
};

const processMD: Processor = (ref, context) => {
    const { data, content } = matter(ref.content);

    const renderer = new Renderer();

    renderer.code = ({ text, lang }) => {
        const valid = lang && hljs.getLanguage(lang);
        const code = valid ? hljs.highlight(text, { language: lang }).value : hljs.highlightAuto(text).value;

        return `<pre><code class="hljs ${lang ?? ""}">${code}</code></pre>`;
    };
    renderer.code = renderer.code.bind(renderer);

    const html = parse(content, { async: false, renderer });

    const templatePath = path.join(context?.srcDir ?? "", "templates", `${data.template}.html`);

    const output = instantiateTemplate(templatePath, context?.global ?? {}, data, html);
    const outputBasename = ref.basename.replace(/\.md$/, ".html");

    return PROC[".html"]({ basename: outputBasename, content: output }, context);
};

const processYAML: Processor = (ref) => {
    const output = yaml.parse(ref.content);
    const outputBasename = ref.basename.replace(/\.yaml$/, ".json");
    return [{ basename: outputBasename, content: JSON.stringify(output) }];
};

const PROC = {
    ".js": processJS,
    ".css": processCSS,
    ".html": processHTML,
    ".ts": processTS,
    ".md": processMD,
    ".yaml": processYAML,
} as const;

export function processConfig(context: Context): ServerConfig {
    const inputPath = path.join(context.srcDir, "config.yaml");
    const input = readFileSync(inputPath);

    try {
        return yaml.parse(input);
    } catch (error) {
        console.error("In file %s: %s", inputPath, error);
        return {};
    }
}

export function processFile(context: Context, srcPath: string) {
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
    if (extname in PROC) {
        const input = {
            dirname: path.dirname(srcPath),
            basename: path.basename(srcPath),
            content: readFileSync(srcPath),
        };

        const key = extname as keyof typeof PROC;

        const refs = PROC[key](input, context);

        const dirname = path.dirname(dstPath);
        for (const ref of refs) {
            const filename = path.join(ref.dirname ?? dirname, ref.basename);
            writeFileSync(filename, ref.content);
        }
    } else {
        fs.copyFileSync(srcPath, dstPath);
    }
}

export function processAll(context: Context) {
    if (fs.existsSync(context.dstDir)) {
        fs.rmSync(context.dstDir, { recursive: true, force: true });
    }

    return processFile(context, context.srcDir);
}
