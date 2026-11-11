import React from 'react';
import ReactDOM from 'react-dom/client';
import 'katex/dist/katex.min.css';
import './index.css';
import App from './App';
import { DisplayProvider } from './ui/display';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DisplayProvider>
      <App />
    </DisplayProvider>
  </React.StrictMode>,
);
