export declare const __DEBUG__: boolean;

import { InlineSVGElement } from "./components/inline-svg.js";
import { PageLayout } from "./components/layout.js";
import { LoremIpsumElement } from "./components/lorem.js";

customElements.define("inline-svg", InlineSVGElement);
customElements.define("lorem-ipsum", LoremIpsumElement);
customElements.define("page-layout", PageLayout);

if (__DEBUG__) {
    const ws = new WebSocket(`ws://${location.hostname}:8090/live`);
    ws.onmessage = (event) => {
        if (event.data === "reload") {
            location.reload();
        }
    };
}
