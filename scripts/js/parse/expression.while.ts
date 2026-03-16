import { expect } from "../context.ts";

import parseTopLevelExpression from "./expression.top-level.ts";
import parseExpression from "./expression.ts";

import type { Context, WhileExpression } from "../types.ts";

export default function parseWhileExpression(context: Context): WhileExpression {
    expect(context, "symbol", { value: "while" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context, true);

    expect(context, "other", { value: ")" });

    const expression = parseTopLevelExpression(context, true);

    return { type: "while", condition, expression };
}
