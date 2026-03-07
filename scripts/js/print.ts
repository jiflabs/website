import type { Binding, Expression } from "./types.ts";

function extract<T>(value: T): [keyof T, T[keyof T]][] {
    const entries: [keyof T, T[keyof T]][] = [];

    for (const key in value) {
        entries.push([key, value[key]]);
    }

    return entries;
}

function space(depth: number) {
    let s = "";
    for (let i = 0; i < depth; ++i) {
        s += "  ";
    }
    return s;
}

function printBinding(binding: Binding, compress: boolean): string {
    if (typeof binding === "string") {
        return binding;
    }

    switch (binding.type) {
        case "object": {
            const entries = extract(binding.entries).map(([key, value]) => {
                if (key !== value) {
                    const val = printBinding(value, compress);

                    if (compress) {
                        return `${key}:${val}`;
                    }

                    return `${key}: ${val}`;
                }

                return key;
            });

            if (compress) {
                return `{${entries.join(",")}}`;
            }

            if (entries.length) {
                return `{ ${entries.join(", ")} }`;
            }

            return "{}";
        }

        case "array": {
            const entries = binding.entries.map((entry) => printBinding(entry, compress));

            if (compress) {
                return `[${entries.join(",")}]`;
            }

            if (entries.length) {
                return `[ ${entries.join(", ")} ]`;
            }

            return "[]";
        }

        case "collect": {
            return `...${binding.name}`;
        }
    }
}

function printExpression(expression: Expression, line: boolean, compress: boolean, depth: number): string {
    const end = line ? (compress ? ";" : "\n") : "";

    const sp0 = space(depth);
    const sp1 = space(depth + 1);
    const sp2 = space(depth + 2);

    switch (expression.type) {
        case "export.default": {
            const exp = printExpression(expression.expression, line, compress, depth);

            return `export default ${exp}`;
        }

        case "export.named": {
            const exp = printExpression(expression.expression, line, compress, depth);

            return `export ${exp}`;
        }

        case "export.named.multi": {
            const symbols = extract(expression.symbols).map(([key, value]) => {
                return value !== key ? `${value} as ${key}` : value;
            });

            if (compress) {
                return `export{${symbols.join(",")}}${end}`;
            }

            if (symbols.length) {
                return `export { ${symbols.join(", ")} }${end}`;
            }

            return `export {}${end}`;
        }

        case "export.forward": {
            const symbols = extract(expression.symbols).map(([key, value]) => {
                return value !== key ? `${value} as ${key}` : value;
            });

            if (compress) {
                return `export{${symbols.join(",")}}from"${expression.from}"${end}`;
            }

            if (symbols.length) {
                return `export { ${symbols.join(", ")} } from "${expression.from}"${end}`;
            }

            return `export {} from "${expression.from}"${end}`;
        }

        case "export.forward.all": {
            if (compress) {
                return `export*from"${expression.from}"${end}`;
            }

            return `export * from "${expression.from}"${end}`;
        }

        case "export.forward.default": {
            if (compress) {
                return `export ${expression.name} from"${expression.from}"${end}`;
            }

            return `export ${expression.name} from "${expression.from}"${end}`;
        }

        case "import.named": {
            const symbols = extract(expression.symbols).map(([key, value]) =>
                value !== key ? `${value} as ${key}` : value,
            );

            if (compress) {
                return `import{${symbols.join(",")}}from"${expression.from}"${end}`;
            }

            if (symbols.length) {
                return `import { ${symbols.join(", ")} } from "${expression.from}"${end}`;
            }

            return `import {} from "${expression.from}"${end}`;
        }

        case "import.default": {
            if (compress) {
                return `import ${expression.name} from"${expression.from}"${end}`;
            }

            return `import ${expression.name} from "${expression.from}"${end}`;
        }

        case "import.namespace": {
            if (compress) {
                return `import*as ${expression.as} from"${expression.from}"${end}`;
            }

            return `import * as ${expression.as} from "${expression.from}"${end}`;
        }

        case "import.side-effect": {
            if (compress) {
                return `import"${expression.from}"${end}`;
            }
            return `import "${expression.from}"${end}`;
        }

        case "symbol": {
            return `${expression.value}${end}`;
        }

        case "string": {
            return `"${expression.value}"${end}`;
        }

        case "number": {
            return `${expression.value}${end}`;
        }

        case "template": {
            const exps = expression.expressions.map((expression) => printExpression(expression, false, compress, 0));

            return `\`${expression.strings.reduce((acc, str, idx) => (idx < exps.length ? `${acc}${str}\${${exps[idx]}}` : `${acc}${str}`), "")}\`${end}`;
        }

        case "function.arrow": {
            const exp = printExpression(expression.expression, false, compress, depth);

            if (expression.args.length === 1 && typeof expression.args[0] === "string") {
                if (compress) {
                    return `${expression.args[0]}=>${exp}${end}`;
                }

                return `${expression.args[0]} => ${exp}${end}`;
            }

            const args = expression.args.map((arg) => printBinding(arg, compress));

            if (compress) {
                return `(${args.join(",")})=>${exp}${end}`;
            }

            return `(${args.join(", ")}) => ${exp}${end}`;
        }

        case "binary": {
            const left = printExpression(expression.left, false, compress, depth);
            const right = printExpression(expression.right, false, compress, depth);

            if (compress) {
                return `${left}${expression.operator}${right}${end}`;
            }

            return `${left} ${expression.operator} ${right}${end}`;
        }

        case "unary": {
            const operand = printExpression(expression.operand, false, compress, depth);

            return expression.prefix
                ? `${expression.operator}${operand}${end}`
                : `${operand}${expression.operator}${end}`;
        }

        case "call": {
            const callee = printExpression(expression.callee, false, compress, depth);
            const args = expression.args.map((arg) => printExpression(arg, false, compress, depth));

            if (compress) {
                return `${callee}(${args.join(",")})${end}`;
            }

            return `${callee}(${args.join(", ")})${end}`;
        }

        case "member": {
            const object = printExpression(expression.object, false, compress, depth);

            return `${object}.${expression.member}${end}`;
        }

        case "subscript": {
            const object = printExpression(expression.object, false, compress, depth);
            const key = printExpression(expression.key, false, compress, depth);

            return `${object}[${key}]${end}`;
        }

        case "if": {
            const condition = printExpression(expression.condition, false, compress, depth);

            if (expression.else_) {
                const then = printExpression(expression.then, true, compress, depth);
                const else_ = printExpression(expression.else_, line, compress, depth);

                if (compress) {
                    return `if(${condition})${then}else ${else_}`;
                }

                return `if (${condition}) ${then}${sp0}else ${else_}`;
            }

            const then = printExpression(expression.then, line, compress, depth);

            if (compress) {
                return `if(${condition})${then}`;
            }

            return `if (${condition}) ${then}`;
        }

        case "scope": {
            const exps = expression.expressions.map((expression, index, array) =>
                printExpression(expression, index !== array.length - 1, compress, depth + 1),
            );

            if (compress) {
                return `{${exps.join("")}}`;
            }

            if (exps.length) {
                return `{\n${sp1}${exps.join(sp1)}\n${sp0}}${line ? "\n" : ""}`;
            }

            return `{}${line ? "\n" : ""}`;
        }

        case "variable": {
            const declarations = expression.declarations.map(({ binding, value }) => {
                const first = printBinding(binding, compress);

                if (value) {
                    const second = printExpression(value, false, compress, depth);

                    if (compress) {
                        return `${first}=${second}`;
                    }

                    return `${first} = ${second}`;
                }

                return first;
            });

            if (compress) {
                return `${expression.mode} ${declarations.join(",")}${end}`;
            }

            return `${expression.mode} ${declarations.join(", ")}${end}`;
        }

        case "parenthesis": {
            const exp = printExpression(expression.expression, false, compress, depth);

            return `(${exp})${end}`;
        }

        case "new": {
            const callee = printExpression(expression.callee, false, compress, depth);

            if (expression.args.length) {
                const args = expression.args.map((arg) => printExpression(arg, false, compress, depth));

                if (compress) {
                    return `new ${callee}(${args.join(",")})${end}`;
                }

                return `new ${callee}(${args.join(", ")})${end}`;
            }

            return `new ${callee}${end}`;
        }

        case "while": {
            const condition = printExpression(expression.condition, false, compress, depth);
            const exp = printExpression(expression.expression, line, compress, depth);

            if (compress) {
                return `while(${condition})${exp}`;
            }

            return `while (${condition}) ${exp}`;
        }

        case "do": {
            const condition = printExpression(expression.condition, false, compress, depth);
            const exp = printExpression(expression.expression, true, compress, depth);

            if (compress) {
                return `do ${exp}while(${condition})${end}`;
            }

            return `do ${exp} while (${condition})${end}`;
        }

        case "try": {
            const try_ = printExpression(expression.try_, true, compress, depth);
            const catch_ = printExpression(expression.catch_, true, compress, depth);

            if (expression.finally_) {
                const finally_ = printExpression(expression.finally_, true, compress, depth);

                if (compress) {
                    return `try${try_}catch${expression.name ? `(${expression.name})` : ""}${catch_}finally${finally_}`;
                }

                return `try ${try_} catch${expression.name ? ` (${expression.name})` : ""} ${catch_} finally ${finally_}`;
            }

            if (compress) {
                return `try${try_}catch${expression.name ? `(${expression.name})` : ""}${catch_}`;
            }

            return `try ${try_} catch${expression.name ? ` (${expression.name})` : ""} ${catch_}`;
        }

        case "return": {
            if (expression.expression) {
                const exp = printExpression(expression.expression, false, compress, depth);

                return `return ${exp}${end}`;
            }

            return `return${end}`;
        }

        case "class": {
            const fields = extract(expression.fields).map(([key, value], index, array) => {
                const last = index === array.length - 1;

                const static_ = value.static_ ? "static " : "";

                if (value.type === "value") {
                    if (value.expression) {
                        const exp = printExpression(value.expression, !last, compress, depth + 1);

                        if (compress) {
                            return `${static_}${key}=${exp}`;
                        }

                        return `${static_}${key} = ${exp}`;
                    }

                    if (compress) {
                        return `${static_}${key}${last ? "" : ";"}`;
                    }

                    return `${static_}${key}${last ? "" : "\n"}`;
                }

                const async_ = value.async_ ? "async " : "";
                const args = value.args.map((arg) => printBinding(arg, compress));
                const exp = printExpression(value.expression, !last, compress, depth + 1);

                if (compress) {
                    return `${static_}${async_}${key}(${args.join(",")})${exp}`;
                }

                return `${static_}${async_}${key}(${args.join(", ")}) ${exp}`;
            });

            if (expression.extends_.length) {
                if (compress) {
                    return `class ${expression.name} extends ${expression.extends_.join(",")}{${fields.join("")}}`;
                }

                if (fields.length) {
                    return `class ${expression.name} extends ${expression.extends_.join(", ")} {\n${sp1}${fields.join(sp1)}\n${sp0}}${line ? "\n" : ""}`;
                }

                return `class ${expression.name} extends ${expression.extends_.join(", ")} {}${line ? "\n" : ""}`;
            }

            if (compress) {
                return `class ${expression.name}{${fields.join("")}}`;
            }

            if (fields.length) {
                return `class ${expression.name} {\n${sp1}${fields.join(sp1)}\n${sp0}}${line ? "\n" : ""}`;
            }

            return `class ${expression.name} {}${line ? "\n" : ""}`;
        }

        case "object": {
            const elements = extract(expression.elements).map(([key, value]) => {
                const val = printExpression(value, false, compress, depth);

                if (key !== val) {
                    if (compress) {
                        return `${key}:${val}`;
                    }

                    return `${key}: ${val}`;
                }

                return val;
            });

            if (compress) {
                return `{${elements.join(",")}}${end}`;
            }

            if (elements.length) {
                return `{ ${elements.join(", ")} }${end}`;
            }

            return `{}${end}`;
        }

        case "array": {
            const elements = expression.elements.map((element) => printExpression(element, false, compress, depth));

            if (compress) {
                return `[${elements.join(",")}]${end}`;
            }

            if (elements.length) {
                return `[ ${elements.join(", ")} ]${end}`;
            }

            return `[]${end}`;
        }

        case "template.tagged": {
            const callee = printExpression(expression.callee, false, compress, depth);
            const exps = expression.expressions.map((expression) =>
                printExpression(expression, false, compress, depth),
            );

            return `${callee}\`${expression.strings.reduce((acc, str, idx) => (idx < exps.length ? `${acc}${str}\${${exps[idx]}}` : `${acc}${str}`), "")}\`${end}`;
        }

        case "await": {
            const exp = printExpression(expression.expression, false, compress, depth);

            return `await ${exp}${end}`;
        }

        case "function": {
            const args = expression.args.map((arg) => printBinding(arg, compress));
            const exp = printExpression(expression.expression, true, compress, depth);

            if (compress) {
                return `function ${expression.name ?? ""}(${args.join(",")})${exp}`;
            }

            return `function ${expression.name ?? ""}(${args.join(", ")}) ${exp}`;
        }

        case "break": {
            return `break${end}`;
        }

        case "continue": {
            return `continue${end}`;
        }

        case "switch": {
            const condition = printExpression(expression.condition, false, compress, depth);
            const cases = expression.cases.map((case_, index, array) => {
                const lastcase = index === array.length - 1;

                const match = case_.match
                    ? `case ${printExpression(case_.match, false, compress, depth + 1)}`
                    : "default";
                const exps = case_.expressions.map((expression, index, array) => {
                    const lastexp = lastcase && index === array.length - 1;
                    return printExpression(expression, !lastexp, compress, depth + 2);
                });

                if (compress) {
                    return `${match}:${exps.join("")}`;
                }

                if (exps.length) {
                    return `${match}:\n${sp2}${exps.join(sp2)}`;
                }

                return `${match}:\n`;
            });

            if (compress) {
                return `switch(${condition}){${cases.join("")}}`;
            }

            if (cases.length) {
                return `switch (${condition}) {\n${sp1}${cases.join(sp1)}\n${sp0}}${line ? "\n" : ""}`;
            }

            return `switch (${condition}) {}${line ? "\n" : ""}`;
        }

        case "for.in": {
            const binding = printBinding(expression.binding, compress);
            const iterable = printExpression(expression.iterable, false, compress, depth);
            const exp = printExpression(expression.expression, line, compress, depth);

            if (compress) {
                return `for(${expression.mode} ${binding} in ${iterable})${exp}`;
            }

            return `for (${expression.mode} ${binding} in ${iterable}) ${exp}`;
        }

        case "for.of": {
            const binding = printBinding(expression.binding, compress);
            const iterable = printExpression(expression.iterable, false, compress, depth);
            const exp = printExpression(expression.expression, line, compress, depth);

            if (compress) {
                return `for(${expression.mode} ${binding} of ${iterable})${exp}`;
            }

            return `for (${expression.mode} ${binding} of ${iterable}) ${exp}`;
        }

        case "for.wild": {
            const before = expression.before ? printExpression(expression.before, false, compress, depth) : undefined;
            const condition = expression.condition
                ? printExpression(expression.condition, false, compress, depth)
                : undefined;
            const after = expression.after ? printExpression(expression.after, false, compress, depth) : undefined;
            const exp = printExpression(expression.expression, line, compress, depth);

            if (compress) {
                return `for(${before ?? ""};${condition ?? ""};${after ?? ""})${exp}`;
            }

            return `for (${before ?? ""};${condition ? ` ${condition}` : ""};${after ? ` ${after}` : ""}) ${exp}`;
        }
    }
}

export default function print(expressions: Expression[], compress: boolean = false): string {
    return expressions
        .map((expression, index, array) => printExpression(expression, index !== array.length - 1, compress, 0))
        .join("");
}
