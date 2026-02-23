#!/usr/bin/env node

import { parse } from "./param.js";
import { processAll } from "./process.js";

function main(args) {
    const { "--src-dir": srcDir, "--dst-dir": dstDir } = parse(args, {
        "--src-dir": ["string", true],
        "--dst-dir": ["string", true],
    });

    processAll({ srcDir, dstDir, debug: false });
}

main(process.argv.slice(2));
