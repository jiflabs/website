import { parseBinding } from "../binding.ts";
import { at, expect, skip } from "../context.ts";
import { parseTopLevelExpression } from "../expression.ts";

import parseExpression from "./expression.ts";

import type { Binding, ClassField, Context, Expression } from "../types.ts";

export default function parseClassExpression(context: Context): Expression {
    expect(context, "symbol", { value: "class" });

    const name = expect(context, "symbol").value;

    const extends_: string[] = [];
    if (skip(context, "symbol", { value: "extends" })) {
        do {
            extends_.push(expect(context, "symbol").value);
        } while (skip(context, "operator.comma", { value: "," }));
    }

    const fields: Record<string, ClassField> = {};

    expect(context, "other", { value: "{" });
    while (!at(context, "other", { value: "}" })) {
        let key = expect(context, "symbol").value;

        const static_ = key === "static";
        if (static_) {
            key = expect(context, "symbol").value;
        }

        const async_ = key === "async";
        if (async_) {
            key = expect(context, "symbol").value;
        }

        if (skip(context, "other", { value: "(" })) {
            const args: Binding[] = [];

            while (!at(context, "other", { value: ")" })) {
                args.push(parseBinding(context));

                if (!at(context, "other", { value: ")" })) {
                    expect(context, "operator.comma", { value: "," });
                }
            }
            expect(context, "other", { value: ")" });

            const expression = parseTopLevelExpression(context);

            fields[key] = { type: "function", static_, async_, args, expression };
            continue;
        }

        let expression;
        if (skip(context, "operator.assign", { value: "=" })) {
            expression = parseExpression(context, false);
        }

        fields[key] = { type: "value", static_, expression };

        if (!at(context, "other", { value: "}" })) {
            expect(context, "line");
        }
    }

    expect(context, "other", { value: "}" });

    return { type: "expression.class", name, extends_, fields };
}
