import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/calendar.css';
import './styles/day-cell.css';
import './styles/header.css';
import './styles/mini-calendar.css';
import './styles/overlays.css';
import './styles/mobile.css';
import './styles/index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);