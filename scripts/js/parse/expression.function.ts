import { parseBinding } from "../binding.ts";
import { at, expect } from "../context.ts";
import { parseTopLevelExpression } from "../expression.ts";

import type { Binding, Context, Expression } from "../types.ts";

export default function parseFunctionExpression(context: Context, top: boolean): Expression {
    expect(context, "symbol", { value: "function" });

    let name;
    if (top || !at(context, "other", { value: "(" })) {
        name = expect(context, "symbol").value;
    }

    const args: Binding[] = [];

    expect(context, "other", { value: "(" });
    while (!at(context, "other", { value: ")" })) {
        args.push(parseBinding(context));

        if (!at(context, "other", { value: ")" })) {
            expect(context, "operator.comma", { value: "," });
        }
    }
    expect(context, "other", { value: ")" });

    const expression = parseTopLevelExpression(context);

    return { type: "expression.function", name, args, expression };
}
