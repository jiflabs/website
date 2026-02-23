import { BaseElement, Template, html } from "./base.js";

export class LoremIpsumElement extends BaseElement {
    static readonly observedAttributes = ["count"];

    private count: number = 1;

    constructor() {
        super();
    }

    override async template(): Promise<Template<"html"> | null> {
        const response = await fetch(
            `https://lorem-api.com/api/lorem?paragraphs=${this.count}`,
        );

        const text: string = await response.text();

        return html` ${text} `;
    }

    override attrchanged(
        name: string,
        oldValue: string,
        newValue: string,
    ): void {
        switch (name) {
            case "count":
                this.count = parseInt(newValue, 10);
                this.invalidate();
                break;
        }
    }
}
