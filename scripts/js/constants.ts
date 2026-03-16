import type { AssignOperatorToken, BinaryOperatorToken, CommaOperatorToken, TernaryOperatorToken } from "./types.ts";

export const UNARY_OPERATOR = {
    "!": null,
    "~": null,
    "++": null,
    "--": null,
    "...": null,
} as const;

export const BINARY_OPERATOR = {
    "+": null,
    "-": null,
    "*": null,
    "**": null,
    "/": null,
    "%": null,
    "^": null,
    "&": null,
    "&&": null,
    "|": null,
    "||": null,
    "<<": null,
    ">>": null,
    ">>>": null,
    "==": null,
    "===": null,
    "!=": null,
    "!==": null,
    "<": null,
    "<=": null,
    ">": null,
    ">=": null,
    "??": null,
} as const;

export const TERNARY_OPERATOR = {
    "?": null,
} as const;

export const ASSIGN_OPERATOR = {
    "=": null,
    "+=": null,
    "-=": null,
    "*=": null,
    "**=": null,
    "/=": null,
    "%=": null,
    "^=": null,
    "&=": null,
    "&&=": null,
    "|=": null,
    "||=": null,
    "<<=": null,
    ">>=": null,
    ">>>=": null,
} as const;

export const COMMA_OPERATOR = {
    ",": null,
} as const;

export const ARROW_OPERATOR = {
    "=>": null,
} as const;

export const PRECEDENCE: Record<
    | BinaryOperatorToken["value"]
    | TernaryOperatorToken["value"]
    | AssignOperatorToken["value"]
    | CommaOperatorToken["value"],
    number
> = {
    "+": 11,
    "-": 11,
    "*": 12,
    "**": 13,
    "/": 12,
    "%": 12,
    "^": 6,
    "&": 7,
    "&&": 4,
    "|": 5,
    "||": 3,
    "??": 2.5,
    "<<": 10,
    ">>": 10,
    ">>>": 10,
    "==": 8,
    "===": 8,
    "!=": 8,
    "!==": 8,
    "<": 9,
    "<=": 9,
    ">": 9,
    ">=": 9,

    "?": 2,

    "=": 1,
    "+=": 1,
    "-=": 1,
    "*=": 1,
    "**=": 1,
    "/=": 1,
    "%=": 1,
    "^=": 1,
    "&=": 1,
    "&&=": 1,
    "|=": 1,
    "||=": 1,
    "<<=": 1,
    ">>=": 1,
    ">>>=": 1,

    ",": 0,
};

export const OPERATOR_STATE: Record<string, string[]> = {
    "+": ["=", "+"],
    "-": ["=", "-"],
    "*": ["=", "*"],
    "/": ["="],
    "%": ["="],
    "^": ["="],
    "&": ["=", "&"],
    "|": ["=", "|"],
    "<": ["=", "<"],
    ">": ["=", ">"],
    "=": ["=", ">"],
    "==": ["="],
    "!": ["="],
    "!=": ["="],
    "**": ["="],
    "&&": ["="],
    "||": ["="],
    "<<": ["="],
    ">>": ["=", ">"],
    ">>>": ["="],
    ".": ["."],
    "..": ["."],
    "?": ["?"],
};
