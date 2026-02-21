import { InlineSVGElement } from "./components/inline-svg.js";
import { PageLayout } from "./components/layout.js";

customElements.define("inline-svg", InlineSVGElement);
customElements.define("page-layout", PageLayout);

const ws = new WebSocket(`ws://${location.hostname}:8090/live`);
ws.onmessage = () => location.reload();
