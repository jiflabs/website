import { at, expect } from "../context.ts";

import parseBreakExpression from "./expression.break.ts";
import parseClassExpression from "./expression.class.ts";
import parseContinueExpression from "./expression.continue.ts";
import parseDoExpression from "./expression.do.ts";
import parseForExpression from "./expression.for.ts";
import parseFunctionExpression from "./expression.function.ts";
import parseIfExpression from "./expression.if.ts";
import parseReturnExpression from "./expression.return.ts";
import parseScopeExpression from "./expression.scope.ts";
import parseSwitchExpression from "./expression.switch.ts";
import parseTryExpression from "./expression.try.ts";
import parseExpression from "./expression.ts";
import parseVariableExpression from "./expression.variable.ts";
import parseWhileExpression from "./expression.while.ts";

import type { Context, Expression } from "../types.ts";

export default function parseTopLevelExpression(context: Context, line: boolean): Expression {
    if (at(context, "other", { value: "{" })) {
        return parseScopeExpression(context);
    }

    const token = context.token;

    if (token.type === "symbol") {
        switch (token.value) {
            case "if":
                return parseIfExpression(context);

            case "switch":
                return parseSwitchExpression(context);

            case "for":
                return parseForExpression(context);

            case "while":
                return parseWhileExpression(context);

            case "do":
                return parseDoExpression(context);

            case "try":
                return parseTryExpression(context);

            case "return":
                return parseReturnExpression(context);

            case "break":
                return parseBreakExpression(context);

            case "continue":
                return parseContinueExpression(context);

            case "var":
            case "let":
            case "const":
                return parseVariableExpression(context);

            case "function":
                return parseFunctionExpression(context, true);

            case "class":
                return parseClassExpression(context);
        }
    }

    const expression = parseExpression(context, true);

    if (line) {
        expect(context, "line");
    }

    return expression;
}
