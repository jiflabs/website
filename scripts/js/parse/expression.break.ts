import { expect } from "../context.ts";

import type { BreakExpression, Context } from "../types.ts";

export default function parseBreakExpression(context: Context): BreakExpression {
    expect(context, "symbol", { value: "break" });
    expect(context, "line");
    return { type: "expression.break" };
}
