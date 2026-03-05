import { error } from "../context.ts";

import type { Context, ContinueExpression } from "../types.ts";

export default function parseContinueExpression(context: Context): ContinueExpression {
    error(context.text, context.pos, "TODO: continue expression");
}
