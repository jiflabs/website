import compressJS from "./js/compress.ts";
import parseJS from "./js/parse.ts";

export function minifyJS(text: string) {
    return compressJS(parseJS(text));
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

    text = text.replace(
        /<script\b([^>]*)>([\s\S]*?)<\/script>/gi,
        (_, attr, js) => `<script ${attr}>${minifyJS(js)}</script>`,
    );

    text = text.replace(
        /<style\b([^>]*)>([\s\S]*?)<\/style>/gi,
        (_, attr, css) => `<style ${attr}>${minifyCSS(css)}</style>`,
    );

    text = text.replace(/<pre\b[^>]*>[\s\S]*?<\/pre>|(\s+)/g, (s) => (s.startsWith("<pre") ? s : " "));

    return text.trim();
}
