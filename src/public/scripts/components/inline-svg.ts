import { BaseElement, css, html } from "./base.js";

export class InlineSVGElement extends BaseElement {

    static readonly observedAttributes = ["src"];

    private src: string = "";

    constructor() {
        super();
    }

    override async template() {
        if (!this.src.length) {
            return null;
        }

        const response = await fetch(this.src, {
            method: "GET",
            headers: {
                "accept": "image/svg+xml",
            },
        });

        if (!response.ok) {
            return null;
        }

        const text = await response.text();
        return html`${text}`;
    }

    override async styles() {
        return css`
            :host {
                display: inline-block;

                width: auto;
                height: auto;

                max-width: 100%;
                max-height: 100%;

                >svg {
                    width: 100%;
                    height: 100%;
                }
            }
        `;
    }

    override attrchanged(name: string, oldValue: string, newValue: string): void {
        switch (name) {
            case "src":
                this.src = newValue;
                this.invalidate();
                break;

            default:
                break;
        }
    }
}
