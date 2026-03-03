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

const COMMA_OPERATOR = {
    ",": null,
} as const;

const ARROW_OPERATOR = {
    "=>": null,
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

interface CommaOperatorToken {
    type: "operator.comma";
    value: keyof typeof COMMA_OPERATOR;
}

interface ArrowOperatorToken {
    type: "operator.arrow";
    value: keyof typeof ARROW_OPERATOR;
}

type OperatorToken =
    | UnaryOperatorToken
    | BinaryOperatorToken
    | TernaryOperatorToken
    | AssignOperatorToken
    | CommaOperatorToken
    | ArrowOperatorToken;

interface OtherToken {
    type: "other";
    value: string;
}

const PRECEDENCE: Record<
    | BinaryOperatorToken["value"]
    | TernaryOperatorToken["value"]
    | AssignOperatorToken["value"]
    | CommaOperatorToken["value"],
    number
> = {
    "+": 11,
    "-": 11,
    "*": 12,
    "**": 13,
    "/": 12,
    "%": 12,
    "^": 6,
    "&": 7,
    "&&": 4,
    "|": 5,
    "||": 3,
    "<<": 10,
    ">>": 10,
    ">>>": 10,
    "==": 8,
    "===": 8,
    "!=": 8,
    "!==": 8,
    "<": 9,
    "<=": 9,
    ">": 9,
    ">=": 9,

    "?": 2,

    "=": 1,
    "+=": 1,
    "-=": 1,
    "*=": 1,
    "**=": 1,
    "/=": 1,
    "%=": 1,
    "^=": 1,
    "&=": 1,
    "&&=": 1,
    "|=": 1,
    "||=": 1,
    "<<=": 1,
    ">>=": 1,
    ">>>=": 1,

    ",": 0,
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
    "=": ["=", ">"],
    "==": ["="],
    "!": ["="],
    "!=": ["="],
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
type TokenExtract<T extends TokenType> = Extract<Token, { type: T }>;
type TokenData<T extends TokenType> = Partial<Omit<TokenExtract<T>, "type">>;

interface Context {
    text: string;
    pos: number;
    token: Token;
}

interface NamedExport {
    type: "export.named";
    expression: Expression;
}

interface NamedMultiExport {
    type: "export.named.multi";
    symbols: Record<string, string>;
}

interface DefaultExport {
    type: "export.default";
    expression: Expression;
}

interface ForwardExport {
    type: "export.forward";
    symbols: Record<string, string>;
    from: string;
}

interface ForwardAllExport {
    type: "export.forward.all";
    from: string;
}

interface ForwardDefaultExport {
    type: "export.forward.default";
    name: string;
    from: string;
}

type Export = NamedExport | NamedMultiExport | DefaultExport | ForwardExport | ForwardAllExport | ForwardDefaultExport;

interface NamedImport {
    type: "import.named";
    symbols: Record<string, string>;
    from: string;
}

interface DefaultImport {
    type: "import.default";
    name: string;
    from: string;
}

interface NamespaceImport {
    type: "import.namespace";
    as: string;
    from: string;
}

interface SideEffectImport {
    type: "import.side-effect";
    from: string;
}

type Import = NamedImport | DefaultImport | NamespaceImport | SideEffectImport;

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

interface TemplateLiteral {
    type: "literal.template";
    strings: string[];
    expressions: Expression[];
}

interface ParenExpression {
    type: "expression.paren";
    expression: Expression;
}

interface ArrowFunctionExpression {
    type: "expression.arrow-function";
    args: Binding[];
    expression: Expression;
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

interface ScopeExpression {
    type: "expression.scope";
    expressions: Expression[];
}

interface VariableExpression {
    type: "expression.variable";
    mode: "var" | "let" | "const";
    declarations: { name: string; value?: Expression }[];
}

interface NewExpression {
    type: "expression.new";
    callee: Expression;
    args: Expression[];
}

interface ObjectBinding {
    type: "binding.object";
    entries: Record<string, Binding>;
}

interface ArrayBinding {
    type: "binding.array";
    entries: Binding[];
}

type Binding = string | ObjectBinding | ArrayBinding;

type Expression =
    | Export
    | Import
    | ParenExpression
    | SymbolLiteral
    | StringLiteral
    | NumberLiteral
    | TemplateLiteral
    | ArrowFunctionExpression
    | BinaryExpression
    | UnaryExpression
    | CallExpression
    | MemberExpression
    | SubscriptExpression
    | IfExpression
    | ScopeExpression
    | VariableExpression
    | NewExpression;

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

function get(context: Context) {
    const current = context.token;

    const [token, pos] = parseToken(context.text, context.pos);

    context.token = token;
    context.pos = pos;

    return current;
}

function at<T extends TokenType>(context: Context, type: T, data?: TokenData<T>) {
    if (context.token.type !== type) {
        return false;
    }

    if (data) {
        for (const key in data) {
            if (context.token[key as keyof Token] !== data[key as keyof typeof data]) {
                return false;
            }
        }
    }

    return true;
}

function skip<T extends TokenType>(context: Context, type: T, data?: TokenData<T>) {
    if (at(context, type, data)) {
        get(context);
        return true;
    }
    return false;
}

function expect<T extends TokenType>(context: Context, type: T, data?: TokenData<T>) {
    if (at(context, type, data)) {
        return get(context) as TokenExtract<T>;
    }

    throw new Error(`expect ${type} ${JSON.stringify(data)} <---> found ${JSON.stringify(context.token)}`);
}

function skipLine(context: Context) {
    while (skip(context, "line"));
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
                    case ",":
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

                    get(context);

                    expressions.push(parseExpression(context));

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
        }
    }

    return [{ type: "none" }, pos];
}

function parseBinding(context: Context): Binding {
    if (skip(context, "other", { value: "{" })) {
        const entries: Record<string, Binding> = {};
        while (!at(context, "other", { value: "}" })) {
            const name = expect(context, "symbol").value;

            if (skip(context, "other", { value: ":" })) {
                entries[name] = parseBinding(context);
            } else {
                entries[name] = name;
            }

            if (!at(context, "other", { value: "}" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }
        expect(context, "other", { value: "}" });
        return { type: "binding.object", entries };
    }

    if (skip(context, "other", { value: "[" })) {
        const entries: Binding[] = [];
        while (!at(context, "other", { value: "]" })) {
            entries.push(parseBinding(context));

            if (!at(context, "other", { value: "]" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }
        expect(context, "other", { value: "]" });
        return { type: "binding.array", entries };
    }

    return expect(context, "symbol").value;
}

function parseArrowFunction(context: Context): Expression {
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
        expression = parseExpression(context);
    }

    return { type: "expression.arrow-function", args, expression };
}

function parsePrimary(context: Context): Expression {
    const snapshot = { pos: context.pos, token: context.token };

    if (skip(context, "other", { value: "(" })) {
        if (at(context, "other", { value: ")" })) {
            context.pos = snapshot.pos;
            context.token = snapshot.token;

            return parseArrowFunction(context);
        }

        const expression = parseExpression(context);

        expect(context, "other", { value: ")" });

        if (at(context, "operator.arrow", { value: "=>" })) {
            context.pos = snapshot.pos;
            context.token = snapshot.token;

            return parseArrowFunction(context);
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

    const token = get(context);

    switch (token.type) {
        case "symbol":
            if (at(context, "operator.arrow", { value: "=>" })) {
                context.pos = snapshot.pos;
                context.token = snapshot.token;

                return parseArrowFunction(context);
            }

            return { type: "literal.symbol", name: token.value };

        case "string":
            return { type: "literal.string", value: token.value };

        case "number":
            return { type: "literal.number", value: token.value };

        case "template":
            return { type: "literal.template", strings: token.strings, expressions: token.expressions };

        default:
            throw new Error(`expect primary <---> found ${JSON.stringify(token)}`);
    }
}

function parseCallExpression(context: Context, callee: Expression): Expression {
    const args: Expression[] = [];

    expect(context, "other", { value: "(" });
    while (!at(context, "other", { value: ")" })) {
        args.push(parseExpression(context));

        if (!at(context, "other", { value: ")" })) {
            expect(context, "operator.comma", { value: "," });
        }
    }
    expect(context, "other", { value: ")" });

    return { type: "expression.call", callee, args };
}

function parseMemberExpression(context: Context, object: Expression): Expression {
    expect(context, "other", { value: "." });

    const member = expect(context, "symbol").value;

    return { type: "expression.member", object, member };
}

function parseSubscriptExpression(context: Context, object: Expression): Expression {
    expect(context, "other", { value: "[" });

    const key = parseExpression(context);

    expect(context, "other", { value: "]" });

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
    let expression = parsePrimary(context);

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

        get(context);

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
    expect(context, "symbol", { value: "if" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context);

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
    throw new Error("TODO: while");
}

function parseDoExpression(context: Context): Expression {
    throw new Error("TODO: do");
}

function parseTryExpression(context: Context): Expression {
    throw new Error("TODO: try");
}

function parseReturnExpression(context: Context): Expression {
    throw new Error("TODO: return");
}

function parseControlFlowExpression(context: Context): Expression {
    throw new Error("TODO: control flow");
}

function parseVariableExpression(context: Context): Expression {
    const token = expect(context, "symbol");

    if (token.value !== "var" && token.value !== "let" && token.value !== "const") {
        throw new Error(`expect symbol var, let or const <---> found ${JSON.stringify(token)}`);
    }

    const mode = token.value;

    const declarations: { name: string; value?: Expression }[] = [];
    do {
        const name = expect(context, "symbol").value;

        let value;
        if (skip(context, "operator.assign", { value: "=" })) {
            value = parseExpression(context);
        }

        declarations.push({ name, value });
    } while (skip(context, "operator.comma", { value: "," }));

    return { type: "expression.variable", mode, declarations };
}

function parseFunctionExpression(context: Context, top: boolean): Expression {
    throw new Error("TODO: function");
}

function parseClassExpression(context: Context, top: boolean): Expression {
    throw new Error("TODO: class");
}

function parseTopLevelExpression(context: Context): Expression {
    if (skip(context, "other", { value: "{" })) {
        const expressions: Expression[] = [];
        while (!at(context, "other", { value: "}" })) {
            if (skip(context, "line")) {
                continue;
            }

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
                return parseClassExpression(context, true);
        }
    }

    return parseExpression(context);
}

function parseExportExpression(context: Context): Expression {
    expect(context, "symbol", { value: "export" });

    // { <symbol> [as <symbol>]... }

    // { <symbol> [as <symbol>]... }, * from "<module>"

    const token = context.token;

    if (token.type === "symbol") {
        let expression;
        switch (token.value) {
            case "var":
            case "let":
            case "const":
                expression = parseVariableExpression(context);
                break;

            case "function":
                expression = parseFunctionExpression(context, true);
                break;

            case "class":
                expression = parseClassExpression(context, true);
                break;

            case "default":
                get(context);

                expression = parseExpression(context);
                return { type: "export.default", expression };

            default:
                get(context);

                const name = token.value;

                expect(context, "symbol", { value: "from" });

                const from = expect(context, "string").value;

                return { type: "export.forward.default", name, from };
        }

        return { type: "export.named", expression };
    }

    if (skip(context, "other", { value: "{" })) {
        const symbols: Record<string, string> = {};
        while (!at(context, "other", { value: "}" })) {
            const name = expect(context, "symbol").value;

            if (skip(context, "symbol", { value: "as" })) {
                const as = expect(context, "symbol").value;
                symbols[as] = name;
            } else {
                symbols[name] = name;
            }

            if (!at(context, "other", { value: "}" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }
        expect(context, "other", { value: "}" });

        if (skip(context, "symbol", { value: "from" })) {
            const from = expect(context, "string").value;

            return { type: "export.forward", symbols, from };
        }

        return { type: "export.named.multi", symbols };
    }

    expect(context, "operator.binary", { value: "*" });
    expect(context, "symbol", { value: "from" });

    const from = expect(context, "string").value;

    return { type: "export.forward.all", from };
}

function parseImportExpression(context: Context): Expression {
    expect(context, "symbol", { value: "import" });

    if (skip(context, "operator.binary", { value: "*" })) {
        expect(context, "symbol", { value: "as" });

        const as = expect(context, "symbol").value;

        expect(context, "symbol", { value: "from" });

        const from = expect(context, "string").value;

        return { type: "import.namespace", as, from };
    }

    if (at(context, "symbol")) {
        const name = expect(context, "symbol").value;

        expect(context, "symbol", { value: "from" });

        const from = expect(context, "string").value;

        return { type: "import.default", name, from };
    }

    if (skip(context, "other", { value: "{" })) {
        const symbols: Record<string, string> = {};

        while (!at(context, "other", { value: "}" })) {
            const name = expect(context, "symbol").value;

            if (skip(context, "symbol", { value: "as" })) {
                const as = expect(context, "symbol").value;
                symbols[as] = name;
            } else {
                symbols[name] = name;
            }

            if (!at(context, "other", { value: "}" })) {
                expect(context, "operator.comma", { value: "," });
            }
        }

        expect(context, "other", { value: "}" });
        expect(context, "symbol", { value: "from" });

        const from = expect(context, "string").value;

        return { type: "import.named", symbols, from };
    }

    const from = expect(context, "string").value;

    return { type: "import.side-effect", from };
}

export function parse(text: string) {
    const expressions: Expression[] = [];

    const context: Context = {
        pos: 0,
        text,
        token: { type: "none" },
    };

    get(context);

    while (context.token.type !== "none") {
        if (skip(context, "line")) {
            continue;
        }

        const token = context.token;

        if (token.type === "symbol") {
            switch (token.value) {
                case "export":
                    expressions.push(parseExportExpression(context));
                    continue;

                case "import":
                    expressions.push(parseImportExpression(context));
                    continue;
            }
        }

        expressions.push(parseTopLevelExpression(context));
    }

    return expressions;
}

function extract<T>(value: T): [keyof T, T[keyof T]][] {
    const entries: [keyof T, T[keyof T]][] = [];

    for (const key in value) {
        entries.push([key, value[key]]);
    }

    return entries;
}

function compressBinding(binding: Binding): string {
    if (typeof binding === "string") {
        return binding;
    }

    switch (binding.type) {
        case "binding.object":
            return `{${extract(binding.entries)
                .map(([key, value]) => (key !== value ? `${key}:${compressBinding(value)}` : key))
                .join(",")}}`;

        case "binding.array":
            return `[${binding.entries.map(compressBinding).join(",")}]`;
    }
}

export function compress(expression: Expression): string {
    switch (expression.type) {
        case "export.default":
            return `export default ${compress(expression.expression)}`;

        case "export.forward":
            return `export{${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}from"${expression.from}"`;

        case "export.named":
            return `export ${compress(expression.expression)}`;

        case "export.named.multi":
            return `export {${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}`;

        case "export.forward.all":
            return `export*from"${expression.from}"`;

        case "export.forward.default":
            return `export ${expression.name} from"${expression.from}"`;

        case "import.named":
            return `import{${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}from"${expression.from}"`;

        case "import.default":
            return `import ${expression.name} from"${expression.from}"`;

        case "import.namespace":
            return `import*as ${expression.as} from"${expression.from}"`;

        case "import.side-effect":
            return `import"${expression.from}"`;

        case "literal.symbol":
            return expression.name;

        case "literal.string":
            return `"${expression.value}"`;

        case "literal.number":
            return `${expression.value}`;

        case "literal.template":
            return `\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${compress(expression.expressions[idx])}}` : `${acc}${str}`), "")}\``;

        case "expression.arrow-function":
            if (expression.args.length === 1 && typeof expression.args[0] === "string")
                return `${expression.args[0]}=>${compress(expression.expression)}`;
            return `(${expression.args.map(compressBinding).join(",")})=>${expression.expression}`;

        case "expression.binary":
            return `${compress(expression.left)}${expression.operator}${compress(expression.right)}`;

        case "expression.unary":
            return expression.prefix
                ? `${expression.operator}${compress(expression.operand)}`
                : `${compress(expression.operand)}${expression.operator}`;

        case "expression.call":
            return `${compress(expression.callee)}(${expression.args.map(compress).join(",")})`;

        case "expression.member":
            return `${compress(expression.object)}.${expression.member}`;

        case "expression.subscript":
            return `${compress(expression.object)}[${compress(expression.key)}]`;

        case "expression.if":
            if (expression.else_)
                return `if(${compress(expression.condition)})${compress(expression.then)} else ${compress(expression.else_)}`;
            return `if(${compress(expression.condition)})${compress(expression.then)}`;

        case "expression.scope":
            return `{${expression.expressions.map(compress).join(";")}}`;

        case "expression.variable":
            return `${expression.mode} ${expression.declarations.map(({ name, value }) => (value ? `${name}=${compress(value)}` : name)).join(",")}`;

        case "expression.paren":
            return `(${compress(expression.expression)})`;

        case "expression.new":
            if (expression.args.length)
                return `new ${compress(expression.callee)}(${expression.args.map(compress).join(",")})`;
            return `new ${compress(expression.callee)}`;
    }
}
