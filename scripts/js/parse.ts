import { get, skip } from "./context.ts";

import parseExportExpression from "./parse/expression.export.ts";
import parseImportExpression from "./parse/expression.import.ts";
import parseTopLevelExpression from "./parse/expression.top-level.ts";

import type { Context, Expression } from "./types.ts";

export default function parse(text: string): Expression[] {
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

        expressions.push(parseTopLevelExpression(context, true));
    }

    return expressions;
}
