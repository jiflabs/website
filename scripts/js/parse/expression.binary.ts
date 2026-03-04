import { PRECEDENCE } from "../constants.ts";
import { get } from "../context.ts";

import parseOperandExpression from "./expression.operand.ts";

import type { Context, Expression, Token } from "../types.ts";

const isPrecedenceOperator = (token: Token) =>
    token.type === "operator.binary"
    || token.type === "operator.ternary"
    || token.type === "operator.assign"
    || token.type === "operator.comma";

const isNonAssignPrecedenceOperator = (token: Token) =>
    token.type === "operator.binary" || token.type === "operator.ternary";

const isAssignPrecedenceOperator = (token: Token) =>
    token.type === "operator.assign" || token.type === "operator.comma";

export default function parseBinaryExpression(context: Context, left: Expression, min: number): Expression {
    while (isPrecedenceOperator(context.token) && PRECEDENCE[context.token.value] >= min) {
        const operator = context.token.value;
        const pre = PRECEDENCE[operator];

        get(context);

        let right = parseOperandExpression(context);
        while (
            (isNonAssignPrecedenceOperator(context.token) && PRECEDENCE[context.token.value] > pre)
            || (isAssignPrecedenceOperator(context.token) && PRECEDENCE[context.token.value] === pre)
        ) {
            right = parseBinaryExpression(context, right, pre + (PRECEDENCE[context.token.value] > pre ? 1 : 0));
        }

        left = { type: "expression.binary", left, right, operator };
    }
    return left;
}
