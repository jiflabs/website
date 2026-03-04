import { at, expect, skip } from "./context.ts";

import type { Binding, Context } from "./types.ts";

export function parseBinding(context: Context): Binding {
    if (skip(context, "other", { value: "{" })) {
        const entries: Record<string, Binding> = {};
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
        return { type: "binding.object", entries };
    }

    if (skip(context, "other", { value: "[" })) {
        const entries: Binding[] = [];
        while (!at(context, "other", { value: "]" })) {
            entries.push(parseBinding(context));

            if (!at(context, "other", { value: "]" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }
        expect(context, "other", { value: "]" });
        return { type: "binding.array", entries };
    }

    if (skip(context, "operator.unary", { value: "..." })) {
        const name = expect(context, "symbol").value;
        return { type: "binding.collect", name };
    }

    return expect(context, "symbol").value;
}
