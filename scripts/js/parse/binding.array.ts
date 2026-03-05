import { at, expect } from "../context.ts";

import parseBinding from "./binding.ts";

import type { ArrayBinding, Binding, Context } from "../types.ts";

export default function parseArrayBinding(context: Context): ArrayBinding {
    const entries: Binding[] = [];

    expect(context, "other", { value: "[" });
    while (!at(context, "other", { value: "]" })) {
        entries.push(parseBinding(context));

        if (!at(context, "other", { value: "]" })) {
            expect(context, "operator.comma", { value: "," });
        }
    }
    expect(context, "other", { value: "]" });

    return { type: "binding.array", entries };
}
