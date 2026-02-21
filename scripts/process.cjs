const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const SRC_DIR = path.resolve(__dirname, '../src');
const DST_DIR = path.resolve(__dirname, '../dst');

function processFile(src_path) {
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
                    sourceMap: true,
                    strict: true,
                },
            });

            fs.writeFileSync(dst_path.replace(/\.ts$/, '.js'), result.outputText, 'utf-8');
        } else {
            fs.copyFileSync(src_path, dst_path);
        }
    }
}

function processAll() {
    if (fs.existsSync(DST_DIR)) {
        fs.rmSync(DST_DIR, { recursive: true, force: true });
    }

    processFile(SRC_DIR);
}

module.exports = { processFile, processAll };
