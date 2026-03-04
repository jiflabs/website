import { at, expect, skip } from "./context.ts";

import type { Context, Expression } from "./types.ts";

function parseIfExpression(context: Context): Expression {
    expect(context, "symbol", { value: "if" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context, true);

    expect(context, "other", { value: ")" });

    const then = parseTopLevelExpression(context);

    if (!skip(context, "symbol", { value: "else" })) {
        return { type: "expression.if", condition, then };
    }

    const else_ = parseTopLevelExpression(context);

    return { type: "expression.if", condition, then, else_ };
}

function parseSwitchExpression(context: Context): Expression {
    throw new Error("TODO: switch");
}

function parseForExpression(context: Context): Expression {
    throw new Error("TODO: for");
}

function parseWhileExpression(context: Context): Expression {
    expect(context, "symbol", { value: "while" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context, true);

    expect(context, "other", { value: ")" });

    const expression = parseTopLevelExpression(context);

    return { type: "expression.while", condition, expression };
}

function parseDoExpression(context: Context): Expression {
    expect(context, "symbol", { value: "do" });

    const expression = parseTopLevelExpression(context);

    expect(context, "symbol", { value: "while" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context, true);

    expect(context, "other", { value: ")" });

    return { type: "expression.do", condition, expression };
}

function parseTryExpression(context: Context): Expression {
    expect(context, "symbol", { value: "try" });

    const expression = parseTopLevelExpression(context);

    expect(context, "symbol", { value: "catch" });

    let name;
    if (skip(context, "other", { value: "(" })) {
        name = expect(context, "symbol").value;
        expect(context, "other", { value: ")" });
    }

    const catchBlock = parseTopLevelExpression(context);

    let finallyBlock;
    if (skip(context, "symbol", { value: "finally" })) {
        finallyBlock = parseTopLevelExpression(context);
    }

    return { type: "expression.try", expression, name, catchBlock, finallyBlock };
}

function parseReturnExpression(context: Context): Expression {
    expect(context, "symbol", { value: "return" });

    if (at(context, "line")) {
        return { type: "expression.return" };
    }

    const expression = parseExpression(context, true);

    return { type: "expression.return", expression };
}

function parseControlFlowExpression(context: Context): Expression {
    throw new Error("TODO: control flow");
}

export function parseTopLevelExpression(context: Context): Expression {
    if (skip(context, "other", { value: "{" })) {
        const expressions: Expression[] = [];
        while (!at(context, "other", { value: "}" })) {
            expressions.push(parseTopLevelExpression(context));
        }
        expect(context, "other", { value: "}" });
        return { type: "expression.scope", expressions };
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
            case "continue":
                return parseControlFlowExpression(context);

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

    return parseExpression(context, true);
}
