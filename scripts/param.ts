type Parsed<T extends Record<string, ["string" | "number" | "boolean", boolean]>> = {
    [K in keyof T]: T[K][0] extends "string"
        ? T[K][1] extends true
            ? string
            : string | undefined
        : T[K][0] extends "number"
          ? T[K][1] extends true
              ? number
              : number | undefined
          : T[K][1] extends true
            ? boolean
            : boolean | undefined;
};

export function parse<T extends Record<string, ["string" | "number" | "boolean", boolean]>>(
    argv: string[],
    template: T,
): Parsed<T> {
    const map: Record<string, string | number | boolean> = {};
    for (const arg of argv) {
        const split = arg.indexOf("=");
        if (split < 0) {
            if (!(arg in template)) {
                throw new Error(`Undefined param "${arg}".`);
            }

            if (template[arg][0] !== "boolean") {
                throw new Error(`Invalid flag for value param "${arg}".`);
            }

            map[arg] = true;
            continue;
        }

        const key = arg.substring(0, split);
        const val = arg.substring(split + 1);

        if (!(key in template)) {
            throw new Error(`Undefined param "${key}".`);
        }

        switch (template[key][0]) {
            case "string":
                map[key] = val;
                break;
            case "number":
                map[key] = Number(val);
                break;
            default:
                throw new Error(`Invalid value "${val}" for param "${key}".`);
        }
    }

    for (const key in template) {
        if (key in map) {
            continue;
        }

        if (!template[key][1]) {
            continue;
        }

        if (template[key][0] === "boolean") {
            map[key] = false;
            continue;
        }

        throw new Error(`Missing required value param "${key}".`);
    }

    return map as Parsed<T>;
}
