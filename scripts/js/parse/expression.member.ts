import { expect } from "../context.ts";

import type { Context, Expression } from "../types.ts";

export default function parseMemberExpression(context: Context, object: Expression): Expression {
    expect(context, "other", { value: "." });

    const member = expect(context, "symbol").value;

    return { type: "member", object, member };
}
