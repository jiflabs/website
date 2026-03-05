import { expect, skip } from "../context.ts";

import parseTopLevelExpression from "./expression.top-level.ts";
import parseExpression from "./expression.ts";

import type { Context, IfExpression } from "../types.ts";

export default function parseIfExpression(context: Context): IfExpression {
    expect(context, "symbol", { value: "if" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context, true);

    expect(context, "other", { value: ")" });

    const then = parseTopLevelExpression(context, true);

    while (skip(context, "line"));

    if (!skip(context, "symbol", { value: "else" })) {
        return { type: "if", condition, then };
    }

    const else_ = parseTopLevelExpression(context, true);

    return { type: "if", condition, then, else_ };
}
