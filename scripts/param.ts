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
    const map: Record<string, string | boolean> = {};
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

        if (!template[key][1]) {
            continue;
        }

        if (template[key][0] === "boolean") {
            map[key] = false;
            continue;
        }

        throw new Error(`Missing required string param "${key}".`);
    }

    return map as Parsed<T>;
}
