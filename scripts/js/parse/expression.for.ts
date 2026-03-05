import { error } from "../context.ts";

import type { Context, Expression } from "../types.ts";

export default function parseForExpression(context: Context): Expression {
    error(context.text, context.pos, "TODO: for expression");
}
