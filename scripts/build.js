#!/usr/bin/env node

import { parse } from "./param.js";
import { processAll, processConfig } from "./process.js";

async function build(srcDir, dstDir) {
    const config = processConfig({ srcDir, dstDir, debug: false, global: {} });

    try {
        await processAll({ srcDir, dstDir, debug: false, global: config.global });
    } catch (err) {
        console.error("Error while processing:", err);
    }
}

function main(args) {
    const { "--src-dir": srcDir, "--dst-dir": dstDir } = parse(args, {
        "--src-dir": ["string", true],
        "--dst-dir": ["string", true],
    });

    build(srcDir, dstDir);
}

main(process.argv.slice(2));
