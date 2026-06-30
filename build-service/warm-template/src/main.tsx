import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import tailwindStyles from './styles.css?inline';

// Builder patches these two lines for each job
const TAG_NAME = 'taplab-page-template';
const SLUG = 'template';

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
    createRoot(container).render(<App slug={SLUG} />);
  }
}

// Guard: only register once (handles hot-reload and duplicate script injection)
if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, TaplabPage);
}
