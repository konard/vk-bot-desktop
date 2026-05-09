import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';

const root = createRoot(document.getElementById('root'));
const api = typeof window !== 'undefined' ? window.vkbot : undefined;
root.render(
  <StrictMode>
    <App api={api} />
  </StrictMode>
);
