import { BaseElement, html, Template } from "./base.js";
import { create } from "asciinema-player";

export class Asciinema extends BaseElement {
    static readonly observedAttributes = [];

    constructor() {
        super();
    }

    override async template(): Promise<Template<"html"> | null> {
        create("", this.root);

        return html``;
    }
}
