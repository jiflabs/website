import { expect } from "../context.ts";

import parseOperandExpression from "./expression.operand.ts";

import type { Context, Expression } from "../types.ts";

export default function parseNewExpression(context: Context): Expression {
    expect(context, "symbol", { value: "new" });

    const call = parseOperandExpression(context);

    let callee: Expression, args: Expression[];
    if (call.type === "expression.call") {
        callee = call.callee;
        args = call.args;
    } else {
        callee = call;
        args = [];
    }

    return { type: "expression.new", callee, args };
}
