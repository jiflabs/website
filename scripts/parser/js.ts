const UNARY_OPERATOR = {
    "+": null,
    "-": null,
    "!": null,
    "~": null,
    "++": null,
    "--": null,
    "...": null,
} as const;

const BINARY_OPERATOR = {
    "+": null,
    "-": null,
    "*": null,
    "**": null,
    "/": null,
    "%": null,
    "^": null,
    "&": null,
    "&&": null,
    "|": null,
    "||": null,
    "<<": null,
    ">>": null,
    ">>>": null,
    "==": null,
    "===": null,
    "!=": null,
    "!==": null,
    "<": null,
    "<=": null,
    ">": null,
    ">=": null,
} as const;

const TERNARY_OPERATOR = {
    "?": null,
} as const;

const ASSIGN_OPERATOR = {
    "=": null,
    "+=": null,
    "-=": null,
    "*=": null,
    "**=": null,
    "/=": null,
    "%=": null,
    "^=": null,
    "&=": null,
    "&&=": null,
    "|=": null,
    "||=": null,
    "<<=": null,
    ">>=": null,
    ">>>=": null,
} as const;

interface EmptyToken {
    type: "none";
}

interface LineToken {
    type: "line";
}

interface SymbolToken {
    type: "symbol";
    value: string;
}

interface StringToken {
    type: "string";
    value: string;
}

interface TemplateToken {
    type: "template";
    strings: string[];
    expressions: Expression[];
}

interface NumberToken {
    type: "number";
    value: number;
}

interface UnaryOperatorToken {
    type: "operator.unary";
    value: keyof typeof UNARY_OPERATOR;
}

interface BinaryOperatorToken {
    type: "operator.binary";
    value: keyof typeof BINARY_OPERATOR;
}

interface TernaryOperatorToken {
    type: "operator.ternary";
    value: keyof typeof TERNARY_OPERATOR;
}

interface AssignOperatorToken {
    type: "operator.assign";
    value: keyof typeof ASSIGN_OPERATOR;
}

interface OtherToken {
    type: "other";
    value: string;
}

type OperatorToken = UnaryOperatorToken | BinaryOperatorToken | TernaryOperatorToken | AssignOperatorToken;

const PRECEDENCE: Record<
    BinaryOperatorToken["value"] | TernaryOperatorToken["value"] | AssignOperatorToken["value"],
    number
> = {
    "+": 10,
    "-": 10,
    "*": 11,
    "**": 12,
    "/": 11,
    "%": 11,
    "^": 5,
    "&": 6,
    "&&": 3,
    "|": 4,
    "||": 2,
    "<<": 9,
    ">>": 9,
    ">>>": 9,
    "==": 7,
    "===": 7,
    "!=": 7,
    "!==": 7,
    "<": 8,
    "<=": 8,
    ">": 8,
    ">=": 8,

    "?": 1,

    "=": 0,
    "+=": 0,
    "-=": 0,
    "*=": 0,
    "**=": 0,
    "/=": 0,
    "%=": 0,
    "^=": 0,
    "&=": 0,
    "&&=": 0,
    "|=": 0,
    "||=": 0,
    "<<=": 0,
    ">>=": 0,
    ">>>=": 0,
};

const OPERATOR_STATE: Record<string, string[]> = {
    "+": ["=", "+"],
    "-": ["=", "-"],
    "*": ["=", "*"],
    "/": ["="],
    "%": ["="],
    "^": ["="],
    "&": ["=", "&"],
    "|": ["=", "|"],
    "<": ["=", "<"],
    ">": ["=", ">"],
    "=": ["="],
    "!": ["="],
    "**": ["="],
    "&&": ["="],
    "||": ["="],
    "<<": ["="],
    ">>": ["=", ">"],
    ">>>": ["="],
    ".": ["."],
    "..": ["."],
};

type Token =
    | EmptyToken
    | LineToken
    | SymbolToken
    | StringToken
    | TemplateToken
    | NumberToken
    | OperatorToken
    | OtherToken;
type TokenType = Token["type"];

interface Context {
    text: string;
    pos: number;
    token: Token;
}

interface SymbolLiteral {
    type: "literal.symbol";
    name: string;
}

interface StringLiteral {
    type: "literal.string";
    value: string;
}

interface NumberLiteral {
    type: "literal.number";
    value: number;
}

interface BinaryExpression {
    type: "expression.binary";
    left: Expression;
    right: Expression;
    operator: string;
}

interface UnaryExpression {
    type: "expression.unary";
    operand: Expression;
    operator: string;
    prefix: boolean;
}

interface CallExpression {
    type: "expression.call";
    callee: Expression;
    args: Expression[];
}

interface MemberExpression {
    type: "expression.member";
    object: Expression;
    member: string;
}

interface SubscriptExpression {
    type: "expression.subscript";
    object: Expression;
    key: Expression;
}

interface IfExpression {
    type: "expression.if";
    condition: Expression;
    then: Expression;
    else_?: Expression;
}

type Expression =
    | SymbolLiteral
    | StringLiteral
    | NumberLiteral
    | BinaryExpression
    | UnaryExpression
    | CallExpression
    | MemberExpression
    | SubscriptExpression
    | IfExpression;
type ExpressionType = Expression["type"];

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

function atSymbol(context: Context, value: string) {
    return context.token.type === "symbol" && context.token.value === value;
}

function skipSymbol(context: Context, value: string) {
    if (atSymbol(context, value)) {
        skip(context);
        return true;
    }
    return false;
}

function expectSymbol(context: Context, value?: string): SymbolToken {
    if (context.token.type === "symbol" && (typeof value === "undefined" || context.token.value === value)) {
        return skip(context) as SymbolToken;
    }
    throw new Error();
}

function atOther(context: Context, value: string) {
    return context.token.type === "other" && context.token.value === value;
}

function skipOther(context: Context, value: string) {
    if (atOther(context, value)) {
        skip(context);
        return true;
    }
    return false;
}

function expectOther(context: Context, value: string) {
    if (atOther(context, value)) {
        skip(context);
        return;
    }
    throw new Error();
}

function skip(context: Context): Token {
    const current = context.token;

    const [token, pos] = parseToken(context.text, context.pos);
    console.log(token, pos, context.text.slice(context.pos, pos));

    context.token = token;
    context.pos = pos;

    return current;
}

function parseToken(text: string, pos: number): [Token, number] {
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

                    case "+":
                    case "-":
                    case "*":
                    case "/":
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
                        state = "operator";
                        value += c;
                        pos++;
                        break;

                    case ";":
                    case "\n":
                        return [{ type: "line" }, pos + 1];

                    default:
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
                        token: { type: "none" },
                    };

                    skip(context);

                    expressions.push(parseExpression(context));

                    pos = context.pos;

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

                return [{ type: "other", value }, pos];
        }
    }

    return [{ type: "none" }, pos];
}

function parseLiteral(context: Context): Expression {
    const token = context.token;

    switch (token.type) {
        case "symbol":
            return { type: "literal.symbol", name: token.value };

        case "string":
            return { type: "literal.string", value: token.value };

        case "number":
            return { type: "literal.number", value: token.value };

        default:
            throw new Error();
    }
}

function parseCallExpression(context: Context, callee: Expression): Expression {
    const args: Expression[] = [];

    expectOther(context, "(");
    while (!atOther(context, ")")) {
        args.push(parseExpression(context));

        if (!atOther(context, ")")) {
            expectOther(context, ",");
        }
    }
    expectOther(context, ")");

    return { type: "expression.call", callee, args };
}

function parseMemberExpression(context: Context, object: Expression): Expression {
    expectOther(context, ".");

    const member = expectSymbol(context).value;

    return { type: "expression.member", object, member };
}

function parseSubscriptExpression(context: Context, object: Expression): Expression {
    expectOther(context, "[");

    const key = parseExpression(context);

    expectOther(context, "]");

    if (key.type === "literal.string") {
        const member = key.value;
        const [tok] = parseToken(member, 0);
        if (tok.type === "symbol" && tok.value === member) {
            return { type: "expression.member", object, member };
        }
    }

    return { type: "expression.subscript", object, key };
}

function parseOperandExpression(context: Context): Expression {
    let expression = parseLiteral(context);

    while (true) {
        if (atOther(context, "(")) {
            expression = parseCallExpression(context, expression);
            continue;
        }

        if (atOther(context, ".")) {
            expression = parseMemberExpression(context, expression);
            continue;
        }

        if (atOther(context, "[")) {
            expression = parseSubscriptExpression(context, expression);
            continue;
        }

        return expression;
    }
}

const isPrecedenceOperator = (token: Token) =>
    token.type === "operator.binary" || token.type === "operator.ternary" || token.type === "operator.assign";

const isNonAssignPrecedenceOperator = (token: Token) =>
    token.type === "operator.binary" || token.type === "operator.ternary";

const isAssignPrecedenceOperator = (token: Token) => token.type === "operator.assign";

function parseBinaryExpression(context: Context, left: Expression, min: number): Expression {
    while (isPrecedenceOperator(context.token) && PRECEDENCE[context.token.value] >= min) {
        const operator = context.token.value;
        const pre = PRECEDENCE[operator];

        skip(context);

        let right = parseOperandExpression(context);
        while (
            (isNonAssignPrecedenceOperator(context.token) && PRECEDENCE[context.token.value] > pre)
            || (isAssignPrecedenceOperator(context.token) && PRECEDENCE[context.token.value] === pre)
        ) {
            right = parseBinaryExpression(context, right, pre + (PRECEDENCE[context.token.value] > pre ? 1 : 0));
        }

        left = { type: "expression.binary", left, right, operator };
    }
    return left;
}

function parseExpression(context: Context): Expression {
    return parseBinaryExpression(context, parseOperandExpression(context), 0);
}

function parseIfExpression(context: Context): Expression {
    expectSymbol(context, "if");
    expectOther(context, "(");

    const condition = parseExpression(context);

    expectOther(context, ")");

    const then = parseTopLevelExpression(context);

    if (!skipSymbol(context, "else")) {
        return { type: "expression.if", condition, then };
    }

    const else_ = parseTopLevelExpression(context);

    return { type: "expression.if", condition, then, else_ };
}

function parseSwitchExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseForExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseWhileExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseDoExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseTryExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseReturnExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseControlFlowExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseVariableExpression(context: Context): Expression {
    throw new Error("TODO");
}

function parseFunctionExpression(context: Context, top: boolean): Expression {
    throw new Error("TODO");
}

function parseClassExpression(context: Context, top: boolean): Expression {
    throw new Error("TODO");
}

function parseTopLevelExpression(context: Context): Expression {
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
                return parseClassExpression(context, true);
        }
    }

    return parseExpression(context);
}

export function parse(text: string) {
    const expressions: Expression[] = [];

    const context: Context = {
        pos: 0,
        text,
        token: { type: "none" },
    };

    skip(context);

    while (context.token.type !== "none") {
        expressions.push(parseTopLevelExpression(context));
    }

    return expressions;
}
