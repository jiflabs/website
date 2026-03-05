import { at, expect, skip } from "../context.ts";

import type { Context, ImportExpression } from "../types.ts";

export default function parseImportExpression(context: Context): ImportExpression {
    expect(context, "symbol", { value: "import" });

    if (skip(context, "operator.binary", { value: "*" })) {
        expect(context, "symbol", { value: "as" });

        const as = expect(context, "symbol").value;

        expect(context, "symbol", { value: "from" });

        const from = expect(context, "string").value;

        expect(context, "line");

        return { type: "import.namespace", as, from };
    }

    if (at(context, "symbol")) {
        const name = expect(context, "symbol").value;

        expect(context, "symbol", { value: "from" });

        const from = expect(context, "string").value;

        expect(context, "line");

        return { type: "import.default", name, from };
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
        expect(context, "symbol", { value: "from" });

        const from = expect(context, "string").value;

        expect(context, "line");

        return { type: "import.named", symbols, from };
    }

    const from = expect(context, "string").value;

    expect(context, "line");

    return { type: "import.side-effect", from };
}
