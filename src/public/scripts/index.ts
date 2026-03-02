export declare const __DEBUG__: boolean;

import { InlineSVGElement } from "./components/inline-svg.js";
import { PageLayout } from "./components/layout.js";
import { LoremIpsumElement } from "./components/lorem.js";

customElements.define("inline-svg", InlineSVGElement);
customElements.define("lorem-ipsum", LoremIpsumElement);
customElements.define("page-layout", PageLayout);

document.body.classList.remove("wait");

if (__DEBUG__) {
    const protocol = location.protocol === "https" ? "wss" : "ws";
    const ws = new WebSocket(`${protocol}://${location.hostname}:${parseInt(location.port, 10) + 10}`);
    ws.onmessage = (event: MessageEvent<string>) => {
        if (event.data === "reload") {
            location.reload();
        }
    };
}
