import { expect } from "../context.ts";

import parseOperandExpression from "./expression.operand.ts";

import type { Context, Expression } from "../types.ts";

export default function parseAwaitExpression(context: Context): Expression {
    expect(context, "symbol", { value: "await" });

    const expression = parseOperandExpression(context);

    return { type: "await", expression };
}
