import { at, error, expect, get, skip } from "../context.ts";

import parseArrowFunctionExpression from "./expression.function.arrow.ts";
import parseExpression from "./expression.ts";
import parseOperandExpression from "./expression.operand.ts";

import type { Context, Expression } from "../types.ts";

export default function parsePrimaryExpression(context: Context): Expression {
    const snapshot = { pos: context.pos, token: context.token };

    if (skip(context, "other", { value: "(" })) {
        if (at(context, "other", { value: ")" })) {
            context.pos = snapshot.pos;
            context.token = snapshot.token;

            return parseArrowFunctionExpression(context);
        }

        const expression = parseExpression(context, true);

        expect(context, "other", { value: ")" });

        if (at(context, "operator.arrow", { value: "=>" })) {
            context.pos = snapshot.pos;
            context.token = snapshot.token;

            return parseArrowFunctionExpression(context);
        }

        return { type: "expression.paren", expression };
    }

    if (skip(context, "symbol", { value: "new" })) {
        const call = parseOperandExpression(context);

        let callee: Expression, args: Expression[];
        if (call.type === "expression.call") {
            callee = call.callee;
            args = call.args;
        } else {
            callee = call;
            args = [];
        }

        return { type: "expression.new", callee, args };
    }

    if (skip(context, "symbol", { value: "await" })) {
        const expression = parseOperandExpression(context);

        return { type: "expression.await", expression };
    }

    if (skip(context, "other", { value: "{" })) {
        const elements: Record<string | number, Expression> = {};

        while (!at(context, "other", { value: "}" })) {
            let key: Expression;
            if (at(context, "symbol")) {
                const value = expect(context, "symbol").value;
                key = { type: "literal.symbol", value };
            } else if (at(context, "string")) {
                const value = expect(context, "string").value;
                key = { type: "literal.string", value };
            } else if (skip(context, "other", { value: "[" })) {
                const value = expect(context, "number").value;
                expect(context, "other", { value: "]" });
                key = { type: "literal.number", value };
            } else {
                throw new Error();
            }

            let expression: Expression;
            if (skip(context, "other", { value: ":" })) {
                expression = parseExpression(context, false);
            } else if (key.type === "literal.symbol") {
                expression = { ...key };
            } else {
                throw new Error();
            }

            elements[key.value] = expression;

            if (!at(context, "other", { value: "}" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }
        expect(context, "other", { value: "}" });

        return { type: "expression.object", elements };
    }

    if (skip(context, "other", { value: "[" })) {
        const elements: Expression[] = [];

        while (!at(context, "other", { value: "]" })) {
            elements.push(parseExpression(context, false));

            if (!at(context, "other", { value: "]" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }
        expect(context, "other", { value: "]" });

        return { type: "expression.array", elements };
    }

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

        case "operator.unary":
        case "operator.binary": {
            const operand = parseOperandExpression(context);
            return { type: "expression.unary", operand, operator: token.value, prefix: true };
        }

        default:
            error(context.text, snapshot.pos, `expect primary <---> found ${JSON.stringify(token)}`);
    }
}
