import { get, skip } from "./context.ts";
import { parseExportExpression, parseImportExpression, parseTopLevelExpression } from "./expression.ts";

import type { Context, Expression } from "./types.ts";

export default function parse(text: string) {
    const expressions: Expression[] = [];

    const context: Context = {
        text,

        pos: 0,
        line: true,

        token: { type: "none" },
    };

    get(context);

    while (context.token.type !== "none") {
        if (skip(context, "line")) {
            continue;
        }

        const token = context.token;

        if (token.type === "symbol") {
            switch (token.value) {
                case "export":
                    expressions.push(parseExportExpression(context));
                    continue;

                case "import":
                    expressions.push(parseImportExpression(context));
                    continue;
            }
        }

        expressions.push(parseTopLevelExpression(context));
    }

    return expressions;
}
