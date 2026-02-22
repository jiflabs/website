#!/usr/bin/env node

import { parse } from "./param.js";
import { processAll } from "./process.js";

function main(args) {
    const { src_dir, dst_dir } = parse(args, {
        src_dir: ["string", true],
        dst_dir: ["string", true],
    });

    processAll(src_dir, dst_dir, false);
}

main(process.argv.slice(2));
