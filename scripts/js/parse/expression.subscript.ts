import { expect } from "../context.ts";
import parseToken from "./token.ts";

import parseExpression from "./expression.ts";

import type { Context, Expression } from "../types.ts";

export default function parseSubscriptExpression(context: Context, object: Expression): Expression {
    expect(context, "other", { value: "[" });

    const key = parseExpression(context, true);

    expect(context, "other", { value: "]" });

    if (key.type === "string") {
        const member = key.value;
        const [tok] = parseToken(member, 0, false);
        if (tok.type === "symbol" && tok.value === member) {
            return { type: "member", object, member };
        }
    }

    return { type: "subscript", object, key };
}
