const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const SRC_DIR = path.resolve(__dirname, '../src');
const DST_DIR = path.resolve(__dirname, '../dst');

/**
 * @param {string} src_path 
 * @param {boolean?} debug 
 */
function processFile(src_path, debug) {
    const rel_path = path.relative(SRC_DIR, src_path);
    const dst_path = path.join(DST_DIR, rel_path);

    const src = fs.statSync(src_path);

    if (src.isDirectory()) {
        fs.mkdirSync(dst_path, { recursive: true });
        fs.readdirSync(src_path).forEach((file) => processFile(path.join(src_path, file)));
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
 * @param {boolean?} debug
 */
function processAll(debug) {
    if (fs.existsSync(DST_DIR)) {
        fs.rmSync(DST_DIR, { recursive: true, force: true });
    }

    processFile(SRC_DIR, debug);
}

module.exports = { processFile, processAll };
