import { at, expect } from "../context.ts";

import parseArrayBinding from "./binding.array.ts";
import parseCollectBinding from "./binding.collect.ts";
import parseObjectBinding from "./binding.object.ts";

import type { Binding, Context } from "../types.ts";

export default function parseBinding(context: Context): Binding {
    if (at(context, "other", { value: "{" })) {
        return parseObjectBinding(context);
    }

    if (at(context, "other", { value: "[" })) {
        return parseArrayBinding(context);
    }

    if (at(context, "operator.unary", { value: "..." })) {
        return parseCollectBinding(context);
    }

    return expect(context, "symbol").value;
}
