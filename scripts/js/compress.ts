import { type Binding, type Expression } from "./types.ts";

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

        case "binding.collect":
            return `...${binding.name}`;
    }
}

function compressExpression(expression: Expression): string {
    switch (expression.type) {
        case "export.default":
            return `export default ${compressExpression(expression.expression)}`;

        case "export.forward":
            return `export{${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}from"${expression.from}"`;

        case "export.named":
            return `export ${compressExpression(expression.expression)}`;

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
            return expression.value;

        case "literal.string":
            return `"${expression.value}"`;

        case "literal.number":
            return `${expression.value}`;

        case "literal.template":
            return `\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${compressExpression(expression.expressions[idx])}}` : `${acc}${str}`), "")}\``;

        case "expression.function.arrow":
            if (expression.args.length === 1 && typeof expression.args[0] === "string") {
                return `${expression.args[0]}=>${compressExpression(expression.expression)}`;
            }
            return `(${expression.args.map(compressBinding).join(",")})=>${expression.expression}`;

        case "expression.binary":
            return `${compressExpression(expression.left)}${expression.operator}${compressExpression(expression.right)}`;

        case "expression.unary":
            return expression.prefix
                ? `${expression.operator}${compressExpression(expression.operand)}`
                : `${compressExpression(expression.operand)}${expression.operator}`;

        case "expression.call":
            return `${compressExpression(expression.callee)}(${expression.args.map(compressExpression).join(",")})`;

        case "expression.member":
            return `${compressExpression(expression.object)}.${expression.member}`;

        case "expression.subscript":
            return `${compressExpression(expression.object)}[${compressExpression(expression.key)}]`;

        case "expression.if":
            if (expression.else_) {
                return `if(${compressExpression(expression.condition)})${compressExpression(expression.then)};else ${compressExpression(expression.else_)}`;
            }
            return `if(${compressExpression(expression.condition)})${compressExpression(expression.then)}`;

        case "expression.scope":
            return `{${expression.expressions.map(compressExpression).join(";")}}`;

        case "expression.variable":
            return `${expression.mode} ${expression.declarations.map(({ name, value }) => (value ? `${name}=${compressExpression(value)}` : name)).join(",")}`;

        case "expression.paren":
            return `(${compressExpression(expression.expression)})`;

        case "expression.new":
            if (expression.args.length) {
                return `new ${compressExpression(expression.callee)}(${expression.args.map(compressExpression).join(",")})`;
            }
            return `new ${compressExpression(expression.callee)}`;

        case "expression.while":
            return `while(${compressExpression(expression.condition)})${compressExpression(expression.expression)}`;

        case "expression.do":
            return `do ${compressExpression(expression.expression)};while(${compressExpression(expression.condition)})`;

        case "expression.try":
            return `try${compressExpression(expression.expression)}catch${expression.name ? `(${expression.name})` : ""}${compressExpression(expression.catchBlock)}${expression.finallyBlock ? `finally${compressExpression(expression.finallyBlock)}` : ""}`;

        case "expression.return":
            if (expression.expression) {
                return `return ${compressExpression(expression.expression)}`;
            }
            return "return";

        case "expression.class":
            return `class ${expression.name}${expression.extends_.length ? ` extends ${expression.extends_.join(",")}` : ""}{${extract(
                expression.fields,
            )
                .map(([key, value]) =>
                    value.type === "value"
                        ? `${value.static_ ? "static " : ""}${key}${value.expression ? `=${compressExpression(value.expression)}` : ""}`
                        : `${value.static_ ? "static " : ""}${value.async_ ? "async " : ""}${key}(${value.args.map(compressBinding).join(",")})${compressExpression(value.expression)}`,
                )
                .join(";")}}`;

        case "expression.object":
            return `{${extract(expression.elements)
                .map(([key, value]) => `${key}:${compressExpression(value)}`)
                .join(",")}}`;

        case "expression.array":
            return `[${expression.elements.map(compressExpression).join(",")}]`;

        case "expression.tagged":
            return `${compressExpression(expression.callee)}\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${compressExpression(expression.expressions[idx])}}` : `${acc}${str}`), "")}\``;

        case "expression.await":
            return `await ${compressExpression(expression.expression)}`;

        case "expression.function":
            return `function ${expression.name ?? ""}(${expression.args.map(compressBinding).join(",")})${compressExpression(expression.expression)}`;
    }
}

export default function compress(expression: Expression): string {
    return compressExpression(expression);
}
