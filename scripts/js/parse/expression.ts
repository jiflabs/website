import parseBinaryExpression from "./expression.binary.ts";
import parseOperandExpression from "./expression.operand.ts";

import type { Context, Expression } from "../types";

export default function parseExpression(context: Context, comma: boolean): Expression {
    return parseBinaryExpression(context, parseOperandExpression(context), comma ? 0 : 1);
}
