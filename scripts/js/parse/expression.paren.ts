import { at, expect } from "../context.ts";

import parseArrowFunctionExpression from "./expression.arrow-function.ts";
import parseExpression from "./expression.ts";

import type { Context, Expression } from "../types.ts";

export default function parseParenExpression(context: Context): Expression {
    const snapshot = { pos: context.pos, token: context.token };

    expect(context, "other", { value: "(" });

    if (at(context, "other", { value: ")" })) {
        context.pos = snapshot.pos;
        context.token = snapshot.token;

        return parseArrowFunctionExpression(context);
    }

    const expression = parseExpression(context, true);

    expect(context, "other", { value: ")" });

    if (at(context, "operator.arrow", { value: "=>" })) {
        context.pos = snapshot.pos;
        context.token = snapshot.token;

        return parseArrowFunctionExpression(context);
    }

    return { type: "expression.paren", expression };
}
