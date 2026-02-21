export class BaseElement extends HTMLElement {

    private readonly root: ShadowRoot;

    constructor() {
        super();

        this.root = this.attachShadow({
            mode: "closed",
            clonable: false,
            delegatesFocus: false,
            serializable: false,
        });
    }

    connectedCallback() {
        this.connected();
        this.invalidate();
    }

    disconnectedCallback() {
        this.disconnected();
    }

    connectedMoveCallback() {
        this.moved();
    }

    adoptedCallback() {
        this.adopted();
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        this.attrchanged(name, oldValue, newValue);
    }

    async invalidate() {
        render(await this.template(), await this.styles(), this.root);
    }

    connected() { }
    disconnected() { }
    moved() { }
    adopted() { }
    attrchanged(name: string, oldValue: string, newValue: string) { }

    async template(): Promise<Template<"html"> | null> {
        return null;
    }

    async styles(): Promise<Template<"css"> | null> {
        return null;
    }
}

export interface Template<T extends string> {
    type: T;
    strings: string[];
    values: unknown[];
}

export function css(strings: TemplateStringsArray, ...values: unknown[]): Template<"css"> {
    return { type: "css", strings: [...strings], values };
}

export function html(strings: TemplateStringsArray, ...values: unknown[]): Template<"html"> {
    return { type: "html", strings: [...strings], values };
}

export function render(template: Template<"html"> | null, styles: Template<"css"> | null, container: ShadowRoot) {
    if (template) {
        container.innerHTML = template.strings.reduce((acc, str, idx) => acc + (template.values[idx] ?? "") + str, "");
    } else {
        container.innerHTML = "";
    }

    if (styles) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(styles.strings.reduce((acc, str, idx) => acc + (styles.values[idx] ?? "") + str, ""));

        container.adoptedStyleSheets = [sheet];
    } else {
        container.adoptedStyleSheets = [];
    }
}
