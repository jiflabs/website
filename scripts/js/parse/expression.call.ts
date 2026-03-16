import { at, expect } from "../context.ts";

import parseExpression from "./expression.ts";

import type { Context, Expression } from "../types.ts";

export default function parseCallExpression(context: Context, callee: Expression): Expression {
    const args: Expression[] = [];

    expect(context, "other", { value: "(" });
    while (!at(context, "other", { value: ")" })) {
        args.push(parseExpression(context, false));

        if (!at(context, "other", { value: ")" })) {
            expect(context, "operator.comma", { value: "," });
        }
    }
    expect(context, "other", { value: ")" });

    return { type: "call", callee, args };
}
