import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import './i18n';
import './styles.css';
import { AuthProvider } from './auth/AuthProvider';
import { AuthGate } from './auth/AuthGate';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>,
);
