import { expect, skip } from "../context.ts";

import parseScopeExpression from "./expression.scope.ts";

import type { Context, TryExpression } from "../types.ts";

export default function parseTryExpression(context: Context): TryExpression {
    expect(context, "symbol", { value: "try" });

    const expression = parseScopeExpression(context);

    expect(context, "symbol", { value: "catch" });

    let name;
    if (skip(context, "other", { value: "(" })) {
        name = expect(context, "symbol").value;
        expect(context, "other", { value: ")" });
    }

    const catchBlock = parseScopeExpression(context);

    let finallyBlock;
    if (skip(context, "symbol", { value: "finally" })) {
        finallyBlock = parseScopeExpression(context);
    }

    return { type: "try", expression, name, catchBlock, finallyBlock };
}
