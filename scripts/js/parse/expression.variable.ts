import { error, expect, skip } from "../context.ts";

import parseBinding from "./binding.ts";
import parseExpression from "./expression.ts";

import type { Context, VariableDeclaration, VariableExpression } from "../types.ts";

export default function parseVariableExpression(context: Context): VariableExpression {
    const token = expect(context, "symbol");

    if (token.value !== "var" && token.value !== "let" && token.value !== "const") {
        error(context.text, context.pos, `expect symbol var, let or const <---> found ${JSON.stringify(token)}`);
    }

    const mode = token.value;

    const declarations: VariableDeclaration[] = [];
    do {
        const binding = parseBinding(context);

        let value;
        if (skip(context, "operator.assign", { value: "=" })) {
            value = parseExpression(context, false);
        }

        declarations.push({ binding, value });
    } while (skip(context, "operator.comma", { value: "," }));

    return { type: "variable", mode, declarations };
}
