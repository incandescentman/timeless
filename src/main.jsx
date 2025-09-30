import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/index.css';  // Base styles first
import './styles/calendar.css';  // Then specific component styles
import './styles/day-cell.css';
import './styles/header.css';
import './styles/mini-calendar.css';
import './styles/overlays.css';
import './styles/experimental.css';  // Experimental mode styles
import './styles/mobile.css';  // Mobile overrides last

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);