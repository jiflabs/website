import { expect } from "../context.ts";

import type { CollectBinding, Context } from "../types.ts";

export default function parseCollectBinding(context: Context): CollectBinding {
    expect(context, "operator.unary", { value: "..." });

    const name = expect(context, "symbol").value;

    return { type: "collect", name };
}
