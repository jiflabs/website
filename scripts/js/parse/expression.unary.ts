import { expect } from "../context.ts";

import parseOperandExpression from "./expression.operand.ts";

import type { Context, Expression } from "../types.ts";

export default function parseUnaryExpression(context: Context): Expression {
    const operator = expect(context, ["operator.unary", "operator.binary"]).value;
    const operand = parseOperandExpression(context);

    return { type: "expression.unary", operand, operator, prefix: true };
}
