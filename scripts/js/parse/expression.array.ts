import { at, expect } from "../context.ts";

import parseExpression from "./expression.ts";

import type { Context, Expression } from "../types.ts";

export default function parseArrayExpression(context: Context): Expression {
    const elements: Expression[] = [];

    expect(context, "other", { value: "[" });
    while (!at(context, "other", { value: "]" })) {
        elements.push(parseExpression(context, false));

        if (!at(context, "other", { value: "]" })) {
            expect(context, "operator.comma", { value: "," });
        }
    }
    expect(context, "other", { value: "]" });

    return { type: "expression.array", elements };
}
