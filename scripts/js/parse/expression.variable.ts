import { expect, skip } from "../context.ts";

import parseExpression from "./expression.ts";

import type { Context, Expression } from "../types.ts";

export default function parseVariableExpression(context: Context): Expression {
    const token = expect(context, "symbol");

    if (token.value !== "var" && token.value !== "let" && token.value !== "const") {
        throw new Error(`expect symbol var, let or const <---> found ${JSON.stringify(token)}`);
    }

    const mode = token.value;

    const declarations: { name: string; value?: Expression }[] = [];
    do {
        const name = expect(context, "symbol").value;

        let value;
        if (skip(context, "operator.assign", { value: "=" })) {
            value = parseExpression(context, false);
        }

        declarations.push({ name, value });
    } while (skip(context, "operator.comma", { value: "," }));

    return { type: "expression.variable", mode, declarations };
}
