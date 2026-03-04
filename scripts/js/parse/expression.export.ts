import { at, expect, get, skip } from "../context.ts";

import parseExpression from "./expression.ts";
import parseClassExpression from "./expression.class.ts";
import parseFunctionExpression from "./expression.function.ts";
import parseVariableExpression from "./expression.variable.ts";

import type { Context, Expression } from "../types.ts";

export function parseExportExpression(context: Context): Expression {
    expect(context, "symbol", { value: "export" });

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
                expression = parseClassExpression(context);
                break;

            case "default":
                get(context);

                expression = parseExpression(context, false);

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
