import React from 'react'
import ReactDOM from 'react-dom/client'
// import { registerSW } from 'virtual:pwa-register';

// import App from './App.tsx'

import AppRoutes from "./routes/AppRoutes";
import { AuthProvider } from "@/context/AuthContext";

import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
    
  </React.StrictMode>,
)

// registerSW();

