import { at, error, get } from "../context.ts";

import parseArrayExpression from "./expression.array.ts";
import parseArrowFunctionExpression from "./expression.arrow-function.ts";
import parseAwaitExpression from "./expression.await.ts";
import parseNewExpression from "./expression.new.ts";
import parseObjectExpression from "./expression.object.ts";
import parseParenExpression from "./expression.paren.ts";
import parseUnaryExpression from "./expression.unary.ts";

import type { Context, Expression } from "../types.ts";

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

            return { type: "symbol", value: token.value };

        case "string":
            return { type: "string", value: token.value };

        case "number":
            return { type: "number", value: token.value };

        case "template":
            return { type: "template", strings: token.strings, expressions: token.expressions };

        default:
            error(context.text, snapshot.pos, `expect primary <---> found ${JSON.stringify(token)}`);
    }
}
