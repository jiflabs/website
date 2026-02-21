import { BaseElement, css, html, Template } from "./base.js";

export class PageLayout extends BaseElement {

    static readonly observedAttributes = [];

    constructor() {
        super();
    }

    override async template(): Promise<Template<"html"> | null> {
        return html`
            <link rel="stylesheet" href="/blob/styles/index.css">

            <a href="#main" aria-label="Jump to content"></a>

            <header class="container">
                <a href="/" title="Go to home page" class="icon">
                    <inline-svg src="/blob/images/favicon.svg"></inline-svg>
                </a>

                <nav>
                    <ul>
                        <li><a href="/about">About</a></li>
                        <li><a href="/store">Store</a></li>
                        <li><a href="/blog">Blog</a></li>
                    </ul>
                </nav>
            </header>

            <main id="main" class="container">
                <slot></slot>
            </main>

            <footer class="container">
                <span>
                    &copy; 2026 jiflabs.de
                </span>

                <nav>
                    <ul>
                        <li><a href="/imprint">Imprint</a></li>
                        <li><a href="/privacy">Privacy</a></li>
                    </ul>
                </nav>
            </footer>
        `;
    }
};
