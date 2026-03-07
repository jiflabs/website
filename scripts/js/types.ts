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
    value: ";" | "\n";
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

export interface ObjectBinding {
    type: "object";
    entries: Record<string, Binding>;
}

export interface ArrayBinding {
    type: "array";
    entries: Binding[];
}

export interface CollectBinding {
    type: "collect";
    name: string;
}

export type Binding = string | ObjectBinding | ArrayBinding | CollectBinding;

export interface NamedExportExpression {
    type: "export.named";
    expression: Expression;
}

export interface NamedMultiExportExpression {
    type: "export.named.multi";
    symbols: Record<string, string>;
}

export interface DefaultExportExpression {
    type: "export.default";
    expression: Expression;
}

export interface ForwardExportExpression {
    type: "export.forward";
    symbols: Record<string, string>;
    from: string;
}

export interface ForwardAllExportExpression {
    type: "export.forward.all";
    from: string;
}

export interface ForwardDefaultExportExpression {
    type: "export.forward.default";
    name: string;
    from: string;
}

export type ExportExpression =
    | NamedExportExpression
    | NamedMultiExportExpression
    | DefaultExportExpression
    | ForwardExportExpression
    | ForwardAllExportExpression
    | ForwardDefaultExportExpression;

export interface NamedImportExpression {
    type: "import.named";
    symbols: Record<string, string>;
    from: string;
}

export interface DefaultImportExpression {
    type: "import.default";
    name: string;
    from: string;
}

export interface NamespaceImportExpression {
    type: "import.namespace";
    as: string;
    from: string;
}

export interface SideEffectImportExpression {
    type: "import.side-effect";
    from: string;
}

export type ImportExpression =
    | NamedImportExpression
    | DefaultImportExpression
    | NamespaceImportExpression
    | SideEffectImportExpression;

export interface SymbolExpression {
    type: "symbol";
    value: string;
}

export interface StringExpression {
    type: "string";
    value: string;
}

export interface NumberExpression {
    type: "number";
    value: number;
}

export interface TemplateExpression {
    type: "template";
    strings: string[];
    expressions: Expression[];
}

export interface ParenthesisExpression {
    type: "parenthesis";
    expression: Expression;
}

export interface ArrowFunctionExpression {
    type: "function.arrow";
    args: Binding[];
    expression: Expression;
}

export interface BinaryExpression {
    type: "binary";
    left: Expression;
    right: Expression;
    operator: string;
}

export interface UnaryExpression {
    type: "unary";
    operand: Expression;
    operator: string;
    prefix: boolean;
}

export interface CallExpression {
    type: "call";
    callee: Expression;
    args: Expression[];
}

export interface MemberExpression {
    type: "member";
    object: Expression;
    member: string;
}

export interface SubscriptExpression {
    type: "subscript";
    object: Expression;
    key: Expression;
}

export interface IfExpression {
    type: "if";
    condition: Expression;
    then: Expression;
    else_?: Expression;
}

export interface WhileExpression {
    type: "while";
    condition: Expression;
    expression: Expression;
}

export interface DoExpression {
    type: "do";
    condition: Expression;
    expression: Expression;
}

export interface TryExpression {
    type: "try";
    try_: Expression;
    name?: string;
    catch_: Expression;
    finally_?: Expression;
}

export interface ReturnExpression {
    type: "return";
    expression?: Expression;
}

export interface ScopeExpression {
    type: "scope";
    expressions: Expression[];
}

export interface VariableDeclaration {
    binding: Binding;
    value?: Expression;
}

export interface VariableExpression {
    type: "variable";
    mode: "var" | "let" | "const";
    declarations: VariableDeclaration[];
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
    type: "class";
    name: string;
    extends_: string[];
    fields: Record<string, ClassField>;
}

export interface FunctionExpression {
    type: "function";
    name?: string;
    args: Binding[];
    expression: Expression;
}

export interface NewExpression {
    type: "new";
    callee: Expression;
    args: Expression[];
}

export interface AwaitExpression {
    type: "await";
    expression: Expression;
}

export interface ObjectExpression {
    type: "object";
    elements: Record<string | number, Expression>;
}

export interface ArrayExpression {
    type: "array";
    elements: Expression[];
}

export interface TaggedTemplateExpression extends Omit<TemplateExpression, "type"> {
    type: "template.tagged";
    callee: Expression;
}

export interface BreakExpression {
    type: "break";
}

export interface ContinueExpression {
    type: "continue";
}

export interface SwitchCase {
    match?: Expression;
    expressions: Expression[];
}

export interface SwitchExpression {
    type: "switch";
    condition: Expression;
    cases: SwitchCase[];
}

export interface ForInExpression {
    type: "for.in";
    mode: "var" | "let" | "const";
    binding: Binding;
    iterable: Expression;
    expression: Expression;
}

export interface ForOfExpression {
    type: "for.of";
    mode: "var" | "let" | "const";
    binding: Binding;
    iterable: Expression;
    expression: Expression;
}

export interface ForWildExpression {
    type: "for.wild";
    before?: Expression;
    condition?: Expression;
    after?: Expression;
    expression: Expression;
}

export type ForExpression = ForInExpression | ForOfExpression | ForWildExpression;

export type Expression =
    | ExportExpression
    | ImportExpression
    | ParenthesisExpression
    | SymbolExpression
    | StringExpression
    | NumberExpression
    | TemplateExpression
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
    | TaggedTemplateExpression
    | BreakExpression
    | ContinueExpression
    | SwitchExpression
    | ForExpression;
