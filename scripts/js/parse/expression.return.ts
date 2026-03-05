import { at, expect } from "../context.ts";

import parseExpression from "./expression.ts";

import type { Context, ReturnExpression } from "../types.ts";

export default function parseReturnExpression(context: Context): ReturnExpression {
    expect(context, "symbol", { value: "return" });

    if (at(context, "line")) {
        return { type: "expression.return" };
    }

    const expression = parseExpression(context, true);

    return { type: "expression.return", expression };
}
