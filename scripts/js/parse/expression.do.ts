import { expect } from "../context.ts";

import parseTopLevelExpression from "./expression.top-level.ts";
import parseExpression from "./expression.ts";

import type { Context, DoExpression } from "../types.ts";

export default function parseDoExpression(context: Context): DoExpression {
    expect(context, "symbol", { value: "do" });

    const expression = parseTopLevelExpression(context, true);

    expect(context, "symbol", { value: "while" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context, true);

    expect(context, "other", { value: ")" });

    expect(context, "line");

    return { type: "expression.do", condition, expression };
}
