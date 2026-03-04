import { parseToken } from "./token.ts";

import type { Context, Token, TokenData, TokenExtract, TokenType } from "./types.ts";

export function get(context: Context) {
    const current = context.token;

    const [token, pos] = parseToken(context.text, context.pos, context.line);

    context.token = token;
    context.pos = pos;

    return current;
}

export function at<T extends TokenType>(context: Context, type: T | T[], data?: TokenData<T>) {
    if (typeof type === "string") {
        if (context.token.type !== type) {
            return false;
        }
    } else {
        let match = false;
        for (const ty of type) {
            match = context.token.type === ty;
            if (match) break;
        }
        if (!match) {
            return false;
        }
    }

    if (data) {
        for (const key in data) {
            if (context.token[key as keyof Token] !== data[key as keyof typeof data]) {
                return false;
            }
        }
    }

    return true;
}

export function skip<T extends TokenType>(context: Context, type: T | T[], data?: TokenData<T>) {
    if (at(context, type, data)) {
        get(context);
        return true;
    }
    return false;
}

export function error(text: string, pos: number, message: string): never {
    let row = 1,
        col = 1;

    for (let i = 0; i < pos; ++i) {
        if (text[i] === "\n") {
            col = 0;
            row++;
        }
        col++;
    }

    throw new Error(`at ${row}:${col}: ${message}`);
}

export function expect<T extends TokenType>(context: Context, type: T | T[], data?: TokenData<T>) {
    if (at(context, type, data)) {
        return get(context) as TokenExtract<T>;
    }

    error(
        context.text,
        context.pos,
        `expect ${JSON.stringify(type)}${data ? ` ${JSON.stringify(data)}` : ""} <---> found ${JSON.stringify(context.token)}`,
    );
}
