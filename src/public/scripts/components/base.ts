export abstract class BaseElement extends HTMLElement {
    private readonly root: ShadowRoot;

    constructor() {
        super();

        this.root = this.attachShadow({
            mode: "open",
            clonable: false,
            delegatesFocus: false,
            serializable: false,
        });
    }

    connectedCallback() {
        this.invalidate();
    }

    disconnectedCallback() {}

    connectedMoveCallback() {}

    adoptedCallback() {}

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {}

    async invalidate() {
        const template = await this.template();
        const styles = await this.styles();
        render(template, styles, this.root);
    }

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
    if (template !== null) {
        container.innerHTML = template.strings.reduce((acc, str, idx) => acc + str + (template.values[idx] ?? ""), "");
    } else {
        container.innerHTML = "";
    }

    if (styles !== null) {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(styles.strings.reduce((acc, str, idx) => acc + str + (styles.values[idx] ?? ""), ""));

        container.adoptedStyleSheets = [sheet];
    } else {
        container.adoptedStyleSheets = [];
    }
}
