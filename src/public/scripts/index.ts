import { InlineSVGElement } from "./components/inline-svg.js";

customElements.define("inline-svg", InlineSVGElement);

const ws = new WebSocket(`ws://${location.hostname}:8090/live`);
ws.onmessage = () => location.reload();
