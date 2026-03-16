import { expect } from "../context.ts";

import type { Context, ContinueExpression } from "../types.ts";

export default function parseContinueExpression(context: Context): ContinueExpression {
    expect(context, "symbol", { value: "continue" });
    expect(context, "line");
    return { type: "continue" };
}
