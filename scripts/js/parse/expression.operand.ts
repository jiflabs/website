import { at, expect } from "../context.ts";

import parseCallExpression from "./expression.call.ts";
import parseMemberExpression from "./expression.member.ts";
import parsePrimaryExpression from "./expression.primary.ts";
import parseSubscriptExpression from "./expression.subscript.ts";

import type { Context, Expression } from "../types.ts";

export default function parseOperandExpression(context: Context): Expression {
    let expression = parsePrimaryExpression(context);

    while (true) {
        if (at(context, "other", { value: "(" })) {
            expression = parseCallExpression(context, expression);
            continue;
        }

        if (at(context, "other", { value: "." })) {
            expression = parseMemberExpression(context, expression);
            continue;
        }

        if (at(context, "other", { value: "[" })) {
            expression = parseSubscriptExpression(context, expression);
            continue;
        }

        if (at(context, "template")) {
            const template = expect(context, "template");
            expression = {
                type: "template.tagged",
                callee: expression,
                strings: template.strings,
                expressions: template.expressions,
            };
            continue;
        }

        return expression;
    }
}
