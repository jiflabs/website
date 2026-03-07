/** if debug build */
export declare const __DEBUG__: boolean;

import { InlineSVGElement } from "./components/inline-svg.js";
import { PageLayout } from "./components/layout.js";
import { LoremIpsumElement } from "./components/lorem.js";

customElements.define("inline-svg", InlineSVGElement);
customElements.define("lorem-ipsum", LoremIpsumElement);
customElements.define("page-layout", PageLayout);

document.body.classList.remove("wait"); // remove class to make page content visible; required for lazy loading js components

if (__DEBUG__) {
    /** create the debug websocket */
    const ws = new WebSocket(`${location.protocol.replace("http", "ws")}//${location.host}`);

    /** reload on websocket message */
    ws.onmessage = (event: MessageEvent<string>) => {
        if (event.data === "reload") {
            location.reload();
        }
    };
}
