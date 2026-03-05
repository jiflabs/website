import {
    ARROW_OPERATOR,
    ASSIGN_OPERATOR,
    BINARY_OPERATOR,
    COMMA_OPERATOR,
    OPERATOR_STATE,
    TERNARY_OPERATOR,
    UNARY_OPERATOR,
} from "../constants.ts";
import { get } from "../context.ts";

import parseExpression from "./expression.ts";

import type { Context, Expression, Token } from "../types.ts";

function isSpace(c: string) {
    return /^\s$/.test(c);
}

function isBinDigit(c: string) {
    return /^[0-1]$/.test(c);
}

function isOctDigit(c: string) {
    return /^[0-7]$/.test(c);
}

function isDecDigit(c: string) {
    return /^[0-9]$/.test(c);
}

function isHexDigit(c: string) {
    return /^[0-9a-fA-F]$/.test(c);
}

function isWord(c: string) {
    return /^[a-zA-Z_]$/.test(c);
}

export default function parseToken(text: string, pos: number, line: boolean): [Token, number] {
    let state = "none";

    let value = "";
    let quote = "";

    let floating = false;
    let exponent = false;

    const strings: string[] = [];
    const expressions: Expression[] = [];

    while (pos < text.length) {
        const c = text[pos];
        switch (state) {
            case "none":
                switch (c) {
                    case '"':
                    case "'":
                        state = "string";
                        quote = c;
                        pos++;
                        break;

                    case "`":
                        state = "template";
                        pos++;
                        break;

                    case ".":
                        if (isDecDigit(text[pos + 1])) {
                            state = "number";
                            break;
                        }

                        state = "operator";
                        value += c;
                        pos++;
                        break;

                    case "/":
                        if (text[pos + 1] === "/") {
                            state = "comment.line";
                            pos += 2;
                            break;
                        }
                        if (text[pos + 1] === "*") {
                            state = "comment.block";
                            pos += 2;
                            break;
                        }
                    case "+":
                    case "-":
                    case "*":
                    case "%":
                    case "!":
                    case "~":
                    case "&":
                    case "|":
                    case "^":
                    case "<":
                    case ">":
                    case "=":
                    case "?":
                    case ",":
                        state = "operator";
                        value += c;
                        pos++;
                        break;

                    case ";":
                        return [{ type: "line", value: ";" }, pos + 1];

                    default:
                        if (line && c === "\n") {
                            return [{ type: "line", value: "\n" }, pos + 1];
                        }

                        if (isSpace(c)) {
                            pos++;
                            break;
                        }

                        if (isDecDigit(c)) {
                            state = "number";
                            break;
                        }

                        if (isWord(c)) {
                            state = "symbol";
                            break;
                        }

                        return [{ type: "other", value: c }, pos + 1];
                }
                break;

            case "symbol":
                if (isWord(c) || isDecDigit(c)) {
                    value += c;
                    pos++;
                    break;
                }

                return [{ type: "symbol", value }, pos];

            case "string":
                if (c !== quote) {
                    value += c;
                    pos++;
                    break;
                }

                if (text[pos - 1] === "\\") {
                    value += c;
                    pos++;
                    break;
                }

                return [{ type: "string", value }, pos + 1];

            case "template":
                if (c === "$" && text[pos + 1] === "{") {
                    strings.push(value);

                    const context: Context = {
                        text,

                        pos: pos + 2,
                        line: false,

                        token: { type: "none" },
                    };

                    get(context);

                    expressions.push(parseExpression(context, true));

                    pos = context.pos - 1;

                    while (text[pos] !== "}") pos++;

                    value = "";
                    pos++;
                    break;
                }

                if (c !== "`") {
                    value += c;
                    pos++;
                    break;
                }

                strings.push(value);
                return [{ type: "template", strings, expressions }, pos + 1];

            case "number":
                if (isDecDigit(c)) {
                    value += c;
                    pos++;
                    break;
                }

                if (!floating && c === ".") {
                    floating = true;
                    value += c;
                    pos++;
                    break;
                }

                if (!exponent && (c === "e" || c === "E")) {
                    exponent = true;
                    floating = true;
                    value += c;
                    pos++;

                    if (text[pos] === "+" || text[pos] === "-") {
                        value += text[pos++];
                    }

                    break;
                }

                return [{ type: "number", value: parseFloat(value) }, pos];

            case "operator":
                if (value in OPERATOR_STATE && OPERATOR_STATE[value].includes(c)) {
                    value += c;
                    pos++;
                    break;
                }

                if (value in UNARY_OPERATOR) {
                    // @ts-expect-error
                    return [{ type: "operator.unary", value }, pos];
                }

                if (value in BINARY_OPERATOR) {
                    // @ts-expect-error
                    return [{ type: "operator.binary", value }, pos];
                }

                if (value in TERNARY_OPERATOR) {
                    // @ts-expect-error
                    return [{ type: "operator.ternary", value }, pos];
                }

                if (value in ASSIGN_OPERATOR) {
                    // @ts-expect-error
                    return [{ type: "operator.assign", value }, pos];
                }

                if (value in COMMA_OPERATOR) {
                    // @ts-expect-error
                    return [{ type: "operator.comma", value }, pos];
                }

                if (value in ARROW_OPERATOR) {
                    // @ts-expect-error
                    return [{ type: "operator.arrow", value }, pos];
                }

                return [{ type: "other", value }, pos];

            case "comment.line":
                if (c !== "\n") {
                    pos++;
                    break;
                }
                state = "none";
                break;

            case "comment.block":
                if (c !== "*" || text[pos + 1] !== "/") {
                    pos++;
                    break;
                }
                state = "none";
                break;
        }
    }

    return [{ type: "none" }, pos];
}
