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

function compressExpression(expression: Expression, line: boolean): string {
    switch (expression.type) {
        case "export.default":
            return `export default ${compressExpression(expression.expression, true)}`;

        case "export.forward":
            return `export{${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}from"${expression.from}";`;

        case "export.named":
            return `export ${compressExpression(expression.expression, true)}`;

        case "export.named.multi":
            return `export {${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}};`;

        case "export.forward.all":
            return `export*from"${expression.from}";`;

        case "export.forward.default":
            return `export ${expression.name} from"${expression.from}";`;

        case "import.named":
            return `import{${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}from"${expression.from}";`;

        case "import.default":
            return `import ${expression.name} from"${expression.from}";`;

        case "import.namespace":
            return `import*as ${expression.as} from"${expression.from}";`;

        case "import.side-effect":
            return `import"${expression.from}";`;

        case "literal.symbol":
            return `${expression.value}${line ? ";" : ""}`;

        case "literal.string":
            return `"${expression.value}"${line ? ";" : ""}`;

        case "literal.number":
            return `${expression.value}${line ? ";" : ""}`;

        case "literal.template":
            return `\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${compressExpression(expression.expressions[idx], false)}}` : `${acc}${str}`), "")}\`${line ? ";" : ""}`;

        case "expression.function.arrow":
            if (expression.args.length === 1 && typeof expression.args[0] === "string") {
                return `${expression.args[0]}=>${compressExpression(expression.expression, false)}${line ? ";" : ""}`;
            }
            return `(${expression.args.map(compressBinding).join(",")})=>${compressExpression(expression.expression, false)}${line ? ";" : ""}`;

        case "expression.binary":
            return `${compressExpression(expression.left, false)}${expression.operator}${compressExpression(expression.right, false)}${line ? ";" : ""}`;

        case "expression.unary":
            return expression.prefix
                ? `${expression.operator}${compressExpression(expression.operand, false)}${line ? ";" : ""}`
                : `${compressExpression(expression.operand, false)}${expression.operator}${line ? ";" : ""}`;

        case "expression.call":
            return `${compressExpression(expression.callee, false)}(${expression.args.map((x) => compressExpression(x, false)).join(",")})${line ? ";" : ""}`;

        case "expression.member":
            return `${compressExpression(expression.object, false)}.${expression.member}${line ? ";" : ""}`;

        case "expression.subscript":
            return `${compressExpression(expression.object, false)}[${compressExpression(expression.key, false)}]${line ? ";" : ""}`;

        case "expression.if":
            if (expression.else_) {
                return `if(${compressExpression(expression.condition, false)})${compressExpression(expression.then, true)}else ${compressExpression(expression.else_, true)}`;
            }
            return `if(${compressExpression(expression.condition, false)})${compressExpression(expression.then, true)}`;

        case "expression.scope":
            return `{${expression.expressions.map((x) => compressExpression(x, true)).join("")}}`;

        case "expression.variable":
            return `${expression.mode} ${expression.declarations.map(({ name, value }) => (value ? `${name}=${compressExpression(value, false)}` : name)).join(",")};`;

        case "expression.paren":
            return `(${compressExpression(expression.expression, false)})${line ? ";" : ""}`;

        case "expression.new":
            if (expression.args.length) {
                return `new ${compressExpression(expression.callee, false)}(${expression.args.map((x) => compressExpression(x, false)).join(",")})${line ? ";" : ""}`;
            }
            return `new ${compressExpression(expression.callee, false)}${line ? ";" : ""}`;

        case "expression.while":
            return `while(${compressExpression(expression.condition, false)})${compressExpression(expression.expression, true)}`;

        case "expression.do":
            return `do ${compressExpression(expression.expression, true)}while(${compressExpression(expression.condition, false)});`;

        case "expression.try":
            return `try${compressExpression(expression.expression, true)}catch${expression.name ? `(${expression.name})` : ""}${compressExpression(expression.catchBlock, true)}${expression.finallyBlock ? `finally${compressExpression(expression.finallyBlock, true)}` : ""}`;

        case "expression.return":
            if (expression.expression) {
                return `return ${compressExpression(expression.expression, false)};`;
            }
            return "return;";

        case "expression.class":
            return `class ${expression.name}${expression.extends_.length ? ` extends ${expression.extends_.join(",")}` : ""}{${extract(
                expression.fields,
            )
                .map(([key, value]) =>
                    value.type === "value"
                        ? `${value.static_ ? "static " : ""}${key}${value.expression ? `=${compressExpression(value.expression, false)}` : ""};`
                        : `${value.static_ ? "static " : ""}${value.async_ ? "async " : ""}${key}(${value.args.map(compressBinding).join(",")})${compressExpression(value.expression, true)}`,
                )
                .join("")}}`;

        case "expression.object":
            return `{${extract(expression.elements)
                .map(([key, value]) => `${key}:${compressExpression(value, false)}`)
                .join(",")}}${line ? ";" : ""}`;

        case "expression.array":
            return `[${expression.elements.map((x) => compressExpression(x, false)).join(",")}]${line ? ";" : ""}`;

        case "expression.tagged":
            return `${compressExpression(expression.callee, false)}\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${compressExpression(expression.expressions[idx], false)}}` : `${acc}${str}`), "")}\`${line ? ";" : ""}`;

        case "expression.await":
            return `await ${compressExpression(expression.expression, false)}${line ? ";" : ""}`;

        case "expression.function":
            return `function ${expression.name ?? ""}(${expression.args.map(compressBinding).join(",")})${compressExpression(expression.expression, true)}`;

        case "expression.break":
            return "break;";

        case "expression.continue":
            return "continue;";

        case "expression.switch":
            return `switch(${compressExpression(expression.condition, false)}){${expression.cases.map((value) => `${value.match ? `case ${compressExpression(value.match, false)}` : "default"}:${value.expressions.map((x) => compressExpression(x, true)).join("")}`).join("")}}`;
    }
}

export default function compress(expressions: Expression[]): string {
    return expressions.map((x) => compressExpression(x, true)).join("");
}
