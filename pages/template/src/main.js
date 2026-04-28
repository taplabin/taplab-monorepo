import { jsx as _jsx } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import App from './App';
import tailwindStyles from './styles.css?inline';
// UPDATE THIS when creating a new page
const TAG_NAME = 'taplab-page-template';
class TaplabPage extends HTMLElement {
    connectedCallback() {
        const shadow = this.attachShadow({ mode: 'open' });
        // Inject compiled Tailwind CSS inside the shadow root
        const style = document.createElement('style');
        style.textContent = tailwindStyles;
        shadow.appendChild(style);
        // Mount React into the shadow DOM
        const container = document.createElement('div');
        shadow.appendChild(container);
        createRoot(container).render(_jsx(App, {}));
    }
}
// Guard: only register once (handles hot-reload and duplicate script injection)
if (!customElements.get(TAG_NAME)) {
    customElements.define(TAG_NAME, TaplabPage);
}
