import { parseBinding } from "../binding.ts";
import { at, expect, skip } from "../context.ts";
import { parseTopLevelExpression } from "../expression.ts";

import parseExpression from "./expression.ts";

import type { Binding, Context, Expression } from "../types.ts";

export default function parseArrowFunctionExpression(context: Context): Expression {
    const args: Binding[] = [];

    if (skip(context, "other", { value: "(" })) {
        while (!at(context, "other", { value: ")" })) {
            args.push(parseBinding(context));

            if (!at(context, "other", { value: ")" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }
        expect(context, "other", { value: ")" });
    } else {
        args.push(expect(context, "symbol").value);
    }

    expect(context, "operator.arrow", { value: "=>" });

    let expression;
    if (at(context, "other", { value: "{" })) {
        expression = parseTopLevelExpression(context);
    } else {
        expression = parseExpression(context, false);
    }

    return { type: "expression.function.arrow", args, expression };
}
