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
        case "object":
            return `{${extract(binding.entries)
                .map(([key, value]) => (key !== value ? `${key}:${compressBinding(value)}` : key))
                .join(",")}}`;

        case "array":
            return `[${binding.entries.map(compressBinding).join(",")}]`;

        case "collect":
            return `...${binding.name}`;
    }
}

function compressExpression(expression: Expression, line: boolean): string {
    switch (expression.type) {
        case "export.default":
            return `export default ${compressExpression(expression.expression, line)}`;

        case "export.forward":
            return `export{${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}from"${expression.from}"${line ? ";" : ""}`;

        case "export.named":
            return `export ${compressExpression(expression.expression, line)}`;

        case "export.named.multi":
            return `export {${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}${line ? ";" : ""}`;

        case "export.forward.all":
            return `export*from"${expression.from}"${line ? ";" : ""}`;

        case "export.forward.default":
            return `export ${expression.name} from"${expression.from}"${line ? ";" : ""}`;

        case "import.named":
            return `import{${extract(expression.symbols)
                .map(([key, value]) => (value !== key ? `${value} as ${key}` : value))
                .join(",")}}from"${expression.from}"${line ? ";" : ""}`;

        case "import.default":
            return `import ${expression.name} from"${expression.from}"${line ? ";" : ""}`;

        case "import.namespace":
            return `import*as ${expression.as} from"${expression.from}"${line ? ";" : ""}`;

        case "import.side-effect":
            return `import"${expression.from}"${line ? ";" : ""}`;

        case "symbol":
            return `${expression.value}${line ? ";" : ""}`;

        case "string":
            return `"${expression.value}"${line ? ";" : ""}`;

        case "number":
            return `${expression.value}${line ? ";" : ""}`;

        case "template":
            return `\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${compressExpression(expression.expressions[idx], false)}}` : `${acc}${str}`), "")}\`${line ? ";" : ""}`;

        case "function.arrow":
            if (expression.args.length === 1 && typeof expression.args[0] === "string") {
                return `${expression.args[0]}=>${compressExpression(expression.expression, false)}${line ? ";" : ""}`;
            }
            return `(${expression.args.map(compressBinding).join(",")})=>${compressExpression(expression.expression, false)}${line ? ";" : ""}`;

        case "binary":
            return `${compressExpression(expression.left, false)}${expression.operator}${compressExpression(expression.right, false)}${line ? ";" : ""}`;

        case "unary":
            return expression.prefix
                ? `${expression.operator}${compressExpression(expression.operand, false)}${line ? ";" : ""}`
                : `${compressExpression(expression.operand, false)}${expression.operator}${line ? ";" : ""}`;

        case "call":
            return `${compressExpression(expression.callee, false)}(${expression.args.map((x) => compressExpression(x, false)).join(",")})${line ? ";" : ""}`;

        case "member":
            return `${compressExpression(expression.object, false)}.${expression.member}${line ? ";" : ""}`;

        case "subscript":
            return `${compressExpression(expression.object, false)}[${compressExpression(expression.key, false)}]${line ? ";" : ""}`;

        case "if":
            if (expression.else_) {
                return `if(${compressExpression(expression.condition, false)})${compressExpression(expression.then, true)}else ${compressExpression(expression.else_, line)}`;
            }
            return `if(${compressExpression(expression.condition, false)})${compressExpression(expression.then, line)}`;

        case "scope":
            return `{${expression.expressions.map((x) => compressExpression(x, true)).join("")}}`;

        case "variable":
            return `${expression.mode} ${expression.declarations.map(({ binding, value }) => (value ? `${compressBinding(binding)}=${compressExpression(value, false)}` : compressBinding(binding))).join(",")}${line ? ";" : ""}`;

        case "parenthesis":
            return `(${compressExpression(expression.expression, false)})${line ? ";" : ""}`;

        case "new":
            if (expression.args.length) {
                return `new ${compressExpression(expression.callee, false)}(${expression.args.map((x) => compressExpression(x, false)).join(",")})${line ? ";" : ""}`;
            }
            return `new ${compressExpression(expression.callee, false)}${line ? ";" : ""}`;

        case "while":
            return `while(${compressExpression(expression.condition, false)})${compressExpression(expression.expression, line)}`;

        case "do":
            return `do ${compressExpression(expression.expression, true)}while(${compressExpression(expression.condition, false)})${line ? ";" : ""}`;

        case "try":
            return `try${compressExpression(expression.expression, true)}catch${expression.name ? `(${expression.name})` : ""}${compressExpression(expression.catchBlock, true)}${expression.finallyBlock ? `finally${compressExpression(expression.finallyBlock, true)}` : ""}`;

        case "return":
            if (expression.expression) {
                return `return ${compressExpression(expression.expression, false)}${line ? ";" : ""}`;
            }
            return `return${line ? ";" : ""}`;

        case "class":
            return `class ${expression.name}${expression.extends_.length ? ` extends ${expression.extends_.join(",")}` : ""}{${extract(
                expression.fields,
            )
                .map(([key, value]) =>
                    value.type === "value"
                        ? `${value.static_ ? "static " : ""}${key}${value.expression ? `=${compressExpression(value.expression, false)}` : ""};`
                        : `${value.static_ ? "static " : ""}${value.async_ ? "async " : ""}${key}(${value.args.map(compressBinding).join(",")})${compressExpression(value.expression, true)}`,
                )
                .join("")}}`;

        case "object":
            return `{${extract(expression.elements)
                .map(([key, value]) => `${key}:${compressExpression(value, false)}`)
                .join(",")}}${line ? ";" : ""}`;

        case "array":
            return `[${expression.elements.map((x) => compressExpression(x, false)).join(",")}]${line ? ";" : ""}`;

        case "template.tagged":
            return `${compressExpression(expression.callee, false)}\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${compressExpression(expression.expressions[idx], false)}}` : `${acc}${str}`), "")}\`${line ? ";" : ""}`;

        case "await":
            return `await ${compressExpression(expression.expression, false)}${line ? ";" : ""}`;

        case "function":
            return `function ${expression.name ?? ""}(${expression.args.map(compressBinding).join(",")})${compressExpression(expression.expression, true)}`;

        case "break":
            return `break${line ? ";" : ""}`;

        case "continue":
            return `continue${line ? ";" : ""}`;

        case "switch":
            return `switch(${compressExpression(expression.condition, false)}){${expression.cases.map((value) => `${value.match ? `case ${compressExpression(value.match, false)}` : "default"}:${value.expressions.map((x) => compressExpression(x, true)).join("")}`).join("")}}`;

        case "for.in":
            return `for(${expression.mode} ${compressBinding(expression.binding)} in ${compressExpression(expression.iterable, false)})${compressExpression(expression.expression, line)}`;

        case "for.of":
            return `for(${expression.mode} ${compressBinding(expression.binding)} of ${compressExpression(expression.iterable, false)})${compressExpression(expression.expression, line)}`;

        case "for.wild":
            return `for(${expression.before ? compressExpression(expression.before, false) : ""};${expression.condition ? compressExpression(expression.condition, false) : ""};${expression.after ? compressExpression(expression.after, false) : ""})${compressExpression(expression.expression, line)}`;
    }
}

export default function compress(expressions: Expression[]): string {
    return expressions.map((x) => compressExpression(x, true)).join("");
}
