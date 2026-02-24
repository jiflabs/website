export declare const __DEBUG__: boolean;

import { InlineSVGElement } from "./components/inline-svg.js";
import { PageLayout } from "./components/layout.js";
import { LoremIpsumElement } from "./components/lorem.js";

customElements.define("inline-svg", InlineSVGElement);
customElements.define("lorem-ipsum", LoremIpsumElement);
customElements.define("page-layout", PageLayout);

document.body.classList.remove("wait");

if (__DEBUG__) {
    const ws = new WebSocket(`wss://${location.hostname}:${parseInt(location.port, 10) + 10}`);
    ws.onmessage = (event) => {
        if (event.data === "reload") {
            location.reload();
        }
    };
}
