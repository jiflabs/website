import { at, expect, skip } from "../context.ts";

import parseBinding from "./binding.ts";

import type { Binding, Context, ObjectBinding } from "../types.ts";

export default function parseObjectBinding(context: Context): ObjectBinding {
    const entries: Record<string, Binding> = {};

    expect(context, "other", { value: "{" });
    while (!at(context, "other", { value: "}" })) {
        const name = expect(context, "symbol").value;

        if (skip(context, "other", { value: ":" })) {
            entries[name] = parseBinding(context);
        } else {
            entries[name] = name;
        }

        if (!at(context, "other", { value: "}" })) {
            expect(context, "operator.comma", { value: "," });
        }
    }
    expect(context, "other", { value: "}" });

    return { type: "object", entries };
}
