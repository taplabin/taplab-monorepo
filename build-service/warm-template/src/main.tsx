import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import tailwindStyles from './styles.css?inline';

// These are patched by the build service for each job
const TAG_NAME = 'taplab-page-template';
const SLUG = 'template';

class TaplabPage extends HTMLElement {
  connectedCallback() {
    const shadow = this.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = tailwindStyles;
    shadow.appendChild(style);

    const container = document.createElement('div');
    shadow.appendChild(container);
    createRoot(container).render(<App slug={SLUG} />);
  }
}

if (!customElements.get(TAG_NAME)) {
  customElements.define(TAG_NAME, TaplabPage);
}
