import { at, expect, skip } from "../context.ts";

import type { Context, Expression, VariableDeclaration } from "../types.ts";
import parseBinding from "./binding.ts";
import parseTopLevelExpression from "./expression.top-level.ts";
import parseExpression from "./expression.ts";

export default function parseForExpression(context: Context): Expression {
    expect(context, "symbol", { value: "for" });
    expect(context, "other", { value: "(" });

    let before: Expression | undefined;
    if (
        at(context, "symbol", { value: "var" })
        || at(context, "symbol", { value: "let" })
        || at(context, "symbol", { value: "const" })
    ) {
        const mode = expect(context, "symbol").value as "var" | "let" | "const";
        const declarations: VariableDeclaration[] = [];

        do {
            const binding = parseBinding(context);

            let value;
            if (skip(context, "operator.assign", { value: "=" })) {
                value = parseExpression(context, false);
            }

            declarations.push({ binding, value });
        } while (skip(context, "operator.comma", { value: "," }));

        if (declarations.length === 1 && !declarations[0].value) {
            if (skip(context, "symbol", { value: "in" })) {
                const iterable = parseExpression(context, false);
                expect(context, "other", { value: ")" });
                const expression = parseTopLevelExpression(context, true);
                return { type: "for.in", mode, binding: declarations[0].binding, iterable, expression };
            }
            if (skip(context, "symbol", { value: "of" })) {
                const iterable = parseExpression(context, false);
                expect(context, "other", { value: ")" });
                const expression = parseTopLevelExpression(context, true);
                return { type: "for.of", mode, binding: declarations[0].binding, iterable, expression };
            }
        }

        before = { type: "variable", mode, declarations };

        expect(context, "line", { value: ";" });
    } else if (!skip(context, "line", { value: ";" })) {
        before = parseExpression(context, true);

        expect(context, "line", { value: ";" });
    }

    let condition: Expression | undefined;
    if (!skip(context, "line", { value: ";" })) {
        condition = parseExpression(context, true);

        expect(context, "line", { value: ";" });
    }

    let after: Expression | undefined;
    if (!skip(context, "other", { value: ")" })) {
        after = parseExpression(context, true);

        expect(context, "other", { value: ")" });
    }

    const expression = parseTopLevelExpression(context, true);
    return { type: "for.wild", before, condition, after, expression };
}
