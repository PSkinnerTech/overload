import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import './services/web-speech-handler'; // Initialize Web Speech handler

console.log('Renderer starting...');

const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (!rootElement) {
  console.error('Root element not found!');
} else {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
  console.log('React app rendered');
}