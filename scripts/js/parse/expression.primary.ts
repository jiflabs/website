import { at, error, expect, get } from "../context.ts";

import parseArrayExpression from "./expression.array.ts";
import parseArrowFunctionExpression from "./expression.arrow-function.ts";
import parseAwaitExpression from "./expression.await.ts";
import parseNewExpression from "./expression.new.ts";
import parseObjectExpression from "./expression.object.ts";
import parseOperandExpression from "./expression.operand.ts";
import parseParenExpression from "./expression.paren.ts";

import type { Context, Expression } from "../types.ts";
import parseUnaryExpression from "./expression.unary.ts";

export default function parsePrimaryExpression(context: Context): Expression {
    if (at(context, "symbol", { value: "new" })) {
        return parseNewExpression(context);
    }

    if (at(context, "symbol", { value: "await" })) {
        return parseAwaitExpression(context);
    }

    if (at(context, "other", { value: "(" })) {
        return parseParenExpression(context);
    }

    if (at(context, "other", { value: "{" })) {
        return parseObjectExpression(context);
    }

    if (at(context, "other", { value: "[" })) {
        return parseArrayExpression(context);
    }

    if (at(context, ["operator.unary", "operator.binary"])) {
        return parseUnaryExpression(context);
    }

    const snapshot = { pos: context.pos, token: context.token };
    const token = get(context);

    switch (token.type) {
        case "symbol":
            if (at(context, "operator.arrow", { value: "=>" })) {
                context.pos = snapshot.pos;
                context.token = snapshot.token;

                return parseArrowFunctionExpression(context);
            }

            return { type: "literal.symbol", value: token.value };

        case "string":
            return { type: "literal.string", value: token.value };

        case "number":
            return { type: "literal.number", value: token.value };

        case "template":
            return { type: "literal.template", strings: token.strings, expressions: token.expressions };

        default:
            error(context.text, snapshot.pos, `expect primary <---> found ${JSON.stringify(token)}`);
    }
}
