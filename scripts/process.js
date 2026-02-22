import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

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
 * @param {string} src_dir
 * @param {string} dst_dir
 * @param {string} src_path 
 * @param {boolean?} debug 
 */
export function processFile(src_dir, dst_dir, src_path, debug) {

    const rel_path = path.relative(src_dir, src_path);
    const dst_path = path.join(dst_dir, rel_path);

    const src = fs.statSync(src_path);

    if (src.isDirectory()) {
        fs.mkdirSync(dst_path, { recursive: true });
        fs.readdirSync(src_path).forEach((file) => processFile(src_dir, dst_dir, path.join(src_path, file), debug));
    } else if (src.isFile()) {
        if (src_path.endsWith('.ts')) {
            const input = fs.readFileSync(src_path, 'utf-8');
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

            const js_dst_path = dst_path.replace(/\.ts$/, '.js');
            fs.writeFileSync(js_dst_path, result.outputText, 'utf-8');

            if (debug) {
                fs.writeFileSync(`${js_dst_path}.map`, result.sourceMapText, 'utf-8');
                fs.copyFileSync(src_path, dst_path);
            }
        } else {
            fs.copyFileSync(src_path, dst_path);
        }
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
