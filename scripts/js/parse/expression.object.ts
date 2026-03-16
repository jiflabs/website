import { at, expect, skip } from "../context.ts";

import parseExpression from "./expression.ts";

import type { Context, Expression } from "../types.ts";

export default function parseObjectExpression(context: Context): Expression {
    const elements: Record<string | number, Expression> = {};

    const line = context.line;

    context.line = false;
    expect(context, "other", { value: "{" });

    while (!at(context, "other", { value: "}" })) {
        let key: Expression;
        if (skip(context, "other", { value: "[" })) {
            const value = expect(context, "number").value;
            expect(context, "other", { value: "]" });
            key = { type: "number", value };
        } else if (at(context, "string")) {
            const value = expect(context, "string").value;
            key = { type: "string", value };
        } else {
            const value = expect(context, "symbol").value;
            key = { type: "symbol", value };
        }

        let expression: Expression;
        if (key.type === "symbol" && !at(context, "other", { value: ":" })) {
            expression = { ...key };
        } else {
            expect(context, "other", { value: ":" });
            expression = parseExpression(context, false);
        }

        elements[key.value] = expression;

        if (!at(context, "other", { value: "}" })) {
            expect(context, "operator.comma", { value: "," });
        }
    }

    context.line = line;
    expect(context, "other", { value: "}" });

    return { type: "object", elements };
}
