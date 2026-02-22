/**
 * @template T
 * @param {string[]} argv
 * @param {{ [key: string]: ["string" | "boolean", boolean] }} template
 * @returns {{ [key: string]: string | boolean | undefined }}
 */
export function parse(argv, template) {

    const map = {};
    for (const arg of argv) {

        const split = arg.indexOf("=");
        if (split < 0) {
            if (!(arg in template)) {
                throw new Error(`Undefined param "${arg}".`);
            }

            if (template[arg][0] !== "boolean") {
                throw new Error(`Invalid type "boolean" for param "${arg}".`);
            }

            map[arg] = true;
            continue;
        }

        const key = arg.substring(0, split);
        const val = arg.substring(split + 1);

        if (!(key in template)) {
            throw new Error(`Undefined param "${key}".`);
        }

        if (template[key][0] !== "string") {
            throw new Error(`Invalid type "string" for param "${key}".`);
        }

        map[key] = val;
    }

    for (const key in template) {
        if (key in map) {
            continue;
        }

        if (template[key][1]) {
            throw new Error(`Missing required param "${key}".`);
        }
    }

    return map;
}
