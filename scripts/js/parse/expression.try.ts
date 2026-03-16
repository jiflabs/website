import { expect, skip } from "../context.ts";

import parseScopeExpression from "./expression.scope.ts";

import type { Context, TryExpression } from "../types.ts";

export default function parseTryExpression(context: Context): TryExpression {
    expect(context, "symbol", { value: "try" });

    const try_ = parseScopeExpression(context);

    expect(context, "symbol", { value: "catch" });

    let name;
    if (skip(context, "other", { value: "(" })) {
        name = expect(context, "symbol").value;
        expect(context, "other", { value: ")" });
    }

    const catch_ = parseScopeExpression(context);

    let finally_;
    if (skip(context, "symbol", { value: "finally" })) {
        finally_ = parseScopeExpression(context);
    }

    return { type: "try", try_, name, catch_, finally_ };
}
