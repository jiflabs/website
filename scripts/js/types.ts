import type {
    ARROW_OPERATOR,
    ASSIGN_OPERATOR,
    BINARY_OPERATOR,
    COMMA_OPERATOR,
    TERNARY_OPERATOR,
    UNARY_OPERATOR,
} from "./constants.ts";

export interface EmptyToken {
    type: "none";
}

export interface LineToken {
    type: "line";
}

export interface SymbolToken {
    type: "symbol";
    value: string;
}

export interface StringToken {
    type: "string";
    value: string;
}

export interface TemplateToken {
    type: "template";
    strings: string[];
    expressions: Expression[];
}

export interface NumberToken {
    type: "number";
    value: number;
}

export interface UnaryOperatorToken {
    type: "operator.unary";
    value: keyof typeof UNARY_OPERATOR;
}

export interface BinaryOperatorToken {
    type: "operator.binary";
    value: keyof typeof BINARY_OPERATOR;
}

export interface TernaryOperatorToken {
    type: "operator.ternary";
    value: keyof typeof TERNARY_OPERATOR;
}

export interface AssignOperatorToken {
    type: "operator.assign";
    value: keyof typeof ASSIGN_OPERATOR;
}

export interface CommaOperatorToken {
    type: "operator.comma";
    value: keyof typeof COMMA_OPERATOR;
}

export interface ArrowOperatorToken {
    type: "operator.arrow";
    value: keyof typeof ARROW_OPERATOR;
}

export type OperatorToken =
    | UnaryOperatorToken
    | BinaryOperatorToken
    | TernaryOperatorToken
    | AssignOperatorToken
    | CommaOperatorToken
    | ArrowOperatorToken;

export interface OtherToken {
    type: "other";
    value: string;
}

export type Token =
    | EmptyToken
    | LineToken
    | SymbolToken
    | StringToken
    | TemplateToken
    | NumberToken
    | OperatorToken
    | OtherToken;
export type TokenType = Token["type"];
export type TokenExtract<T extends TokenType> = Extract<Token, { type: T }>;
export type TokenData<T extends TokenType> = Partial<Omit<TokenExtract<T>, "type">>;

export interface Context {
    text: string;

    pos: number;
    line: boolean;

    token: Token;
}

export interface NamedExport {
    type: "export.named";
    expression: Expression;
}

export interface NamedMultiExport {
    type: "export.named.multi";
    symbols: Record<string, string>;
}

export interface DefaultExport {
    type: "export.default";
    expression: Expression;
}

export interface ForwardExport {
    type: "export.forward";
    symbols: Record<string, string>;
    from: string;
}

export interface ForwardAllExport {
    type: "export.forward.all";
    from: string;
}

export interface ForwardDefaultExport {
    type: "export.forward.default";
    name: string;
    from: string;
}

export type Export =
    | NamedExport
    | NamedMultiExport
    | DefaultExport
    | ForwardExport
    | ForwardAllExport
    | ForwardDefaultExport;

export interface NamedImport {
    type: "import.named";
    symbols: Record<string, string>;
    from: string;
}

export interface DefaultImport {
    type: "import.default";
    name: string;
    from: string;
}

export interface NamespaceImport {
    type: "import.namespace";
    as: string;
    from: string;
}

export interface SideEffectImport {
    type: "import.side-effect";
    from: string;
}

export type Import = NamedImport | DefaultImport | NamespaceImport | SideEffectImport;

export interface SymbolLiteral {
    type: "literal.symbol";
    value: string;
}

export interface StringLiteral {
    type: "literal.string";
    value: string;
}

export interface NumberLiteral {
    type: "literal.number";
    value: number;
}

export interface TemplateLiteral {
    type: "literal.template";
    strings: string[];
    expressions: Expression[];
}

export interface ParenExpression {
    type: "expression.paren";
    expression: Expression;
}

export interface ArrowFunctionExpression {
    type: "expression.function.arrow";
    args: Binding[];
    expression: Expression;
}

export interface BinaryExpression {
    type: "expression.binary";
    left: Expression;
    right: Expression;
    operator: string;
}

export interface UnaryExpression {
    type: "expression.unary";
    operand: Expression;
    operator: string;
    prefix: boolean;
}

export interface CallExpression {
    type: "expression.call";
    callee: Expression;
    args: Expression[];
}

export interface MemberExpression {
    type: "expression.member";
    object: Expression;
    member: string;
}

export interface SubscriptExpression {
    type: "expression.subscript";
    object: Expression;
    key: Expression;
}

export interface IfExpression {
    type: "expression.if";
    condition: Expression;
    then: Expression;
    else_?: Expression;
}

export interface WhileExpression {
    type: "expression.while";
    condition: Expression;
    expression: Expression;
}

export interface DoExpression {
    type: "expression.do";
    condition: Expression;
    expression: Expression;
}

export interface TryExpression {
    type: "expression.try";
    expression: Expression;
    name?: string;
    catchBlock: Expression;
    finallyBlock?: Expression;
}

export interface ReturnExpression {
    type: "expression.return";
    expression?: Expression;
}

export interface ScopeExpression {
    type: "expression.scope";
    expressions: Expression[];
}

export interface VariableExpression {
    type: "expression.variable";
    mode: "var" | "let" | "const";
    declarations: { name: string; value?: Expression }[];
}

export interface ValueClassField {
    type: "value";
    static_: boolean;
    expression?: Expression;
}

export interface FunctionClassField {
    type: "function";
    static_: boolean;
    async_: boolean;
    args: Binding[];
    expression: Expression;
}

export type ClassField = ValueClassField | FunctionClassField;

export interface ClassExpression {
    type: "expression.class";
    name: string;
    extends_: string[];
    fields: Record<string, ClassField>;
}

export interface FunctionExpression {
    type: "expression.function";
    name?: string;
    args: Binding[];
    expression: Expression;
}

export interface NewExpression {
    type: "expression.new";
    callee: Expression;
    args: Expression[];
}

export interface AwaitExpression {
    type: "expression.await";
    expression: Expression;
}

export interface ObjectExpression {
    type: "expression.object";
    elements: Record<string | number, Expression>;
}

export interface ArrayExpression {
    type: "expression.array";
    elements: Expression[];
}

export interface TaggedExpression {
    type: "expression.tagged";
    callee: Expression;
    strings: string[];
    expressions: Expression[];
}

export interface ObjectBinding {
    type: "binding.object";
    entries: Record<string, Binding>;
}

export interface ArrayBinding {
    type: "binding.array";
    entries: Binding[];
}

export interface CollectBinding {
    type: "binding.collect";
    name: string;
}

export type Binding = string | ObjectBinding | ArrayBinding | CollectBinding;

export type Expression =
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
    | WhileExpression
    | DoExpression
    | TryExpression
    | ReturnExpression
    | ScopeExpression
    | VariableExpression
    | ClassExpression
    | FunctionExpression
    | NewExpression
    | AwaitExpression
    | ObjectExpression
    | ArrayExpression
    | TaggedExpression;
