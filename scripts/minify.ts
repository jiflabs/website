import { parse as parseJS } from "./parser/js.ts";

export function minifyJS(text: string) {
    const tree = parseJS(text);
    console.dir(tree, { depth: null });
    return text;
}

export function minifyCSS(text: string) {
    text = text.replace(/\/\*[\s\S]*?\*\//g, "");

    text = text.replace(/\s*([{}:;,])\s*/g, "$1");

    text = text.replace(/;}/g, "}");

    text = text.replace(/\s+/g, " ");

    return text.trim();
}

export function minifyHTML(text: string) {
    text = text.replace(/<!--[\s\S]*?-->/g, "");

    text = text.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, js) => `<script>${minifyJS(js)}</script>`);

    text = text.replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => `<style>${minifyCSS(css)}</style>`);

    text = text.replace(/\s*(>)(<)\s*/g, "$1$2");

    return text.trim();
}
