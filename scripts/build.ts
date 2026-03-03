#!/usr/bin/env node

import { parse } from "./param.ts";
import { processAll, processConfig } from "./process.ts";

async function build(srcDir: string, dstDir: string) {
    const config = processConfig({ srcDir, dstDir, debug: false, global: {} });

    try {
        await processAll({ srcDir, dstDir, debug: false, global: config.global });
    } catch (err) {
        console.error("Error while processing:", err);
    }
}

function main(args: string[]) {
    const { "--src-dir": srcDir, "--dst-dir": dstDir } = parse(args, {
        "--src-dir": ["string", true],
        "--dst-dir": ["string", true],
    } as const);

    build(srcDir, dstDir);
}

main(process.argv.slice(2));
