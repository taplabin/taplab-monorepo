import React from 'react';
import * as ReactDOMClient from 'react-dom/client';
import './index.css';
import App from './App';

// Expose React for the sandbox iframe (avoids CDN ad-blocker issues)
(window as any).__tapReact__ = React;
(window as any).__tapReactDOM__ = ReactDOMClient;

const { createRoot } = ReactDOMClient;

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
