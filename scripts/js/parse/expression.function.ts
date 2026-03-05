import { at, expect } from "../context.ts";

import parseBinding from "./binding.ts";
import parseScopeExpression from "./expression.scope.ts";

import type { Binding, Context, FunctionExpression } from "../types.ts";

export default function parseFunctionExpression(context: Context, top: boolean): FunctionExpression {
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

    const expression = parseScopeExpression(context);

    return { type: "expression.function", name, args, expression };
}
