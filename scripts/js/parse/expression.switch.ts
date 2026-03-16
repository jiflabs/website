import { at, expect, skip } from "../context.ts";

import parseTopLevelExpression from "./expression.top-level.ts";
import parseExpression from "./expression.ts";

import type { Context, Expression, SwitchCase, SwitchExpression } from "../types.ts";

export default function parseSwitchExpression(context: Context): SwitchExpression {
    expect(context, "symbol", { value: "switch" });
    expect(context, "other", { value: "(" });

    const condition = parseExpression(context, true);

    expect(context, "other", { value: ")" });
    expect(context, "other", { value: "{" });

    const cases: SwitchCase[] = [];

    while (!at(context, "other", { value: "}" })) {
        if (skip(context, "line")) {
            continue;
        }

        let match;
        if (!skip(context, "symbol", { value: "default" })) {
            expect(context, "symbol", { value: "case" });

            match = parseExpression(context, true);
        }

        expect(context, "other", { value: ":" });

        const expressions: Expression[] = [];

        while (
            !at(context, "symbol", { value: "case" })
            && !at(context, "symbol", { value: "default" })
            && !at(context, "other", { value: "}" })
        ) {
            if (skip(context, "line")) {
                continue;
            }

            expressions.push(parseTopLevelExpression(context, true));
        }

        cases.push({ match, expressions });
    }

    expect(context, "other", { value: "}" });

    return { type: "switch", condition, cases };
}
