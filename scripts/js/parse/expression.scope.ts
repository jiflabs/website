import { at, expect, skip } from "../context.ts";

import parseTopLevelExpression from "./expression.top-level.ts";

import type { Context, Expression, ScopeExpression } from "../types.ts";

export default function parseScopeExpression(context: Context): ScopeExpression {
    const expressions: Expression[] = [];

    expect(context, "other", { value: "{" });
    while (!at(context, "other", { value: "}" })) {
        if (skip(context, "line")) {
            continue;
        }

        expressions.push(parseTopLevelExpression(context, true));
    }
    expect(context, "other", { value: "}" });

    return { type: "scope", expressions };
}
