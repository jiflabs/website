import { type Binding, type Expression } from "./types.ts";

function extract<T>(value: T): [keyof T, T[keyof T]][] {
    const entries: [keyof T, T[keyof T]][] = [];

    for (const key in value) {
        entries.push([key, value[key]]);
    }

    return entries;
}

function printBinding(binding: Binding, compress: boolean): string {
    if (typeof binding === "string") {
        return binding;
    }

    switch (binding.type) {
        case "object":
            return `{${extract(binding.entries)
                .map(([key, value]) => (key !== value ? `${key}:${printBinding(value, compress)}` : key))
                .join(",")}}`;

        case "array":
            return `[${binding.entries.map((entry) => printBinding(entry, compress)).join(",")}]`;

        case "collect":
            return `...${binding.name}`;
    }
}

function printExpression(expression: Expression, line: boolean, compress: boolean): string {
    switch (expression.type) {
        case "export.default":
            return `export default ${printExpression(expression.expression, line, compress)}`;

        case "export.named":
            return `export ${printExpression(expression.expression, line, compress)}`;

        case "export.named.multi": {
            const symbols = extract(expression.symbols).map(([key, value]) =>
                value !== key ? `${value} as ${key}` : value,
            );

            if (compress) {
                return `export{${symbols.join(",")}}${line ? ";" : ""}`;
            }

            return `export { ${symbols.join(", ")} }${line ? "\n" : ""}`;
        }

        case "export.forward": {
            const symbols = extract(expression.symbols).map(([key, value]) =>
                value !== key ? `${value} as ${key}` : value,
            );

            if (compress) {
                return `export{${symbols.join(",")}}from"${expression.from}"${line ? ";" : ""}`;
            }

            return `export { ${symbols.join(", ")} } from "${expression.from}"${line ? "\n" : ""}`;
        }

        case "export.forward.all": {
            if (compress) {
                return `export*from"${expression.from}"${line ? ";" : ""}`;
            }

            return `export * from "${expression.from}"${line ? "\n" : ""}`;
        }

        case "export.forward.default": {
            if (compress) {
                return `export ${expression.name} from"${expression.from}"${line ? ";" : ""}`;
            }

            return `export ${expression.name} from "${expression.from}"${line ? "\n" : ""}`;
        }

        case "import.named": {
            const symbols = extract(expression.symbols).map(([key, value]) =>
                value !== key ? `${value} as ${key}` : value,
            );

            if (compress) {
                return `import{${symbols.join(",")}}from"${expression.from}"${line ? ";" : ""}`;
            }

            return `import { ${symbols.join(", ")} } from "${expression.from}"${line ? "\n" : ""}`;
        }

        case "import.default": {
            if (compress) {
                return `import ${expression.name} from"${expression.from}"${line ? ";" : ""}`;
            }

            return `import ${expression.name} from "${expression.from}"${line ? "\n" : ""}`;
        }

        case "import.namespace": {
            if (compress) {
                return `import*as ${expression.as} from"${expression.from}"${line ? ";" : ""}`;
            }

            return `import * as ${expression.as} from "${expression.from}"${line ? "\n" : ""}`;
        }

        case "import.side-effect": {
            if (compress) {
                return `import"${expression.from}"${line ? ";" : ""}`;
            }
            return `import "${expression.from}"${line ? "\n" : ""}`;
        }

        case "symbol":
            return `${expression.value}${line ? (compress ? ";" : "\n") : ""}`;

        case "string":
            return `"${expression.value}"${line ? (compress ? ";" : "\n") : ""}`;

        case "number":
            return `${expression.value}${line ? (compress ? ";" : "\n") : ""}`;

        case "template":
            return `\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${printExpression(expression.expressions[idx], false, compress)}}` : `${acc}${str}`), "")}\`${line ? (compress ? ";" : "\n") : ""}`;

        case "function.arrow": {
            const body = printExpression(expression.expression, false, compress);
            const args = expression.args.map((arg) => printBinding(arg, compress));

            if (expression.args.length === 1 && typeof expression.args[0] === "string") {
                if (compress) {
                    return `${expression.args[0]}=>${body}${line ? ";" : ""}`;
                }

                return `${expression.args[0]} => ${body}${line ? "\n" : ""}`;
            }

            if (compress) {
                return `(${args.join(",")})=>${body}${line ? ";" : ""}`;
            }

            return `(${args.join(", ")}) => ${body}${line ? "\n" : ""}`;
        }

        case "binary": {
            const left = printExpression(expression.left, false, compress);
            const right = printExpression(expression.right, false, compress);

            if (compress) {
                return `${left}${expression.operator}${right}${line ? ";" : ""}`;
            }

            return `${left} ${expression.operator} ${right}${line ? "\n" : ""}`;
        }

        case "unary": {
            const operand = printExpression(expression.operand, false, compress);

            return expression.prefix
                ? `${expression.operator}${operand}${line ? (compress ? ";" : "\n") : ""}`
                : `${operand}${expression.operator}${line ? (compress ? ";" : "\n") : ""}`;
        }

        case "call": {
            const callee = printExpression(expression.callee, false, compress);
            const args = expression.args.map((x) => printExpression(x, false, compress));

            if (compress) {
                return `${callee}(${args.join(",")})${line ? ";" : ""}`;
            }

            return `${callee}(${args.join(", ")})${line ? "\n" : ""}`;
        }

        case "member": {
            const object = printExpression(expression.object, false, compress);
            return `${object}.${expression.member}${line ? ";" : ""}`;
        }

        case "subscript":
            return `${printExpression(expression.object, false, compress)}[${printExpression(expression.key, false, compress)}]${line ? ";" : ""}`;

        case "if":
            if (expression.else_) {
                return `if(${printExpression(expression.condition, false, compress)})${printExpression(expression.then, true, compress)}else ${printExpression(expression.else_, line, compress)}`;
            }
            return `if(${printExpression(expression.condition, false, compress)})${printExpression(expression.then, line, compress)}`;

        case "scope":
            return `{${expression.expressions.map((expression) => printExpression(expression, true, compress)).join("")}}`;

        case "variable":
            return `${expression.mode} ${expression.declarations.map(({ binding, value }) => (value ? `${printBinding(binding, compress)}=${printExpression(value, false, compress)}` : printBinding(binding, compress))).join(",")}${line ? ";" : ""}`;

        case "parenthesis":
            return `(${printExpression(expression.expression, false, compress)})${line ? ";" : ""}`;

        case "new":
            if (expression.args.length) {
                return `new ${printExpression(expression.callee, false, compress)}(${expression.args.map((x) => printExpression(x, false, compress)).join(",")})${line ? ";" : ""}`;
            }
            return `new ${printExpression(expression.callee, false, compress)}${line ? ";" : ""}`;

        case "while":
            return `while(${printExpression(expression.condition, false, compress)})${printExpression(expression.expression, line, compress)}`;

        case "do":
            return `do ${printExpression(expression.expression, true, compress)}while(${printExpression(expression.condition, false, compress)})${line ? ";" : ""}`;

        case "try":
            return `try${printExpression(expression.expression, true, compress)}catch${expression.name ? `(${expression.name})` : ""}${printExpression(expression.catchBlock, true, compress)}${expression.finallyBlock ? `finally${printExpression(expression.finallyBlock, true, compress)}` : ""}`;

        case "return":
            if (expression.expression) {
                return `return ${printExpression(expression.expression, false, compress)}${line ? ";" : ""}`;
            }
            return `return${line ? ";" : ""}`;

        case "class":
            return `class ${expression.name}${expression.extends_.length ? ` extends ${expression.extends_.join(",")}` : ""}{${extract(
                expression.fields,
            )
                .map(([key, value]) =>
                    value.type === "value"
                        ? `${value.static_ ? "static " : ""}${key}${value.expression ? `=${printExpression(value.expression, false, compress)}` : ""};`
                        : `${value.static_ ? "static " : ""}${value.async_ ? "async " : ""}${key}(${value.args.map((arg) => printBinding(arg, compress)).join(",")})${printExpression(value.expression, true, compress)}`,
                )
                .join("")}}`;

        case "object":
            return `{${extract(expression.elements)
                .map(([key, value]) => `${key}:${printExpression(value, false, compress)}`)
                .join(",")}}${line ? ";" : ""}`;

        case "array":
            return `[${expression.elements.map((element) => printExpression(element, false, compress)).join(",")}]${line ? ";" : ""}`;

        case "template.tagged":
            return `${printExpression(expression.callee, false, compress)}\`${expression.strings.reduce((acc, str, idx) => (idx < expression.expressions.length ? `${acc}${str}\${${printExpression(expression.expressions[idx], false, compress)}}` : `${acc}${str}`), "")}\`${line ? ";" : ""}`;

        case "await":
            return `await ${printExpression(expression.expression, false, compress)}${line ? ";" : ""}`;

        case "function":
            return `function ${expression.name ?? ""}(${expression.args.map((arg) => printBinding(arg, compress)).join(",")})${printExpression(expression.expression, true, compress)}`;

        case "break":
            return `break${line ? ";" : ""}`;

        case "continue":
            return `continue${line ? ";" : ""}`;

        case "switch":
            return `switch(${printExpression(expression.condition, false, compress)}){${expression.cases.map((value) => `${value.match ? `case ${printExpression(value.match, false, compress)}` : "default"}:${value.expressions.map((x) => printExpression(x, true, compress)).join("")}`).join("")}}`;

        case "for.in":
            return `for(${expression.mode} ${printBinding(expression.binding, compress)} in ${printExpression(expression.iterable, false, compress)})${printExpression(expression.expression, line, compress)}`;

        case "for.of":
            return `for(${expression.mode} ${printBinding(expression.binding, compress)} of ${printExpression(expression.iterable, false, compress)})${printExpression(expression.expression, line, compress)}`;

        case "for.wild":
            return `for(${expression.before ? printExpression(expression.before, false, compress) : ""};${expression.condition ? printExpression(expression.condition, false, compress) : ""};${expression.after ? printExpression(expression.after, false, compress) : ""})${printExpression(expression.expression, line, compress)}`;
    }
}

export default function print(expressions: Expression[], compress: boolean = false): string {
    return expressions.map((x) => printExpression(x, true, compress)).join("");
}
