/**
 * @file src/main.tsx
 * @description YYC3 应用入口文件，负责 React 应用渲染、Service Worker 注册、PWA 配置和全局错误处理
 * @author YanYuCloudCube Team <admin@0379.email>
 * @version v1.0.0
 * @created 2026-03-20
 * @updated 2026-03-20
 * @status stable
 * @license MIT
 * @copyright Copyright (c) 2026 YanYuCloudCube Team
 * @tags entry,react,typescript,pwa,critical,public
 * @depends react,react-dom,@/app/App,@/styles
 */

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from '@/app/App';
import '@/styles/index.css';

if (import.meta.env.DEV) {
  const _origConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('fginspector')
    ) {
      return;
    }
    _origConsoleError.apply(console, args);
  };
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[YYC-PWA] Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('[YYC-PWA] Service Worker registration failed:', error);
      });
  });
}

// PWA Manifest Injection
function injectPWAManifest() {
  const manifest = {
    name: 'YYC3 - YanYu Cloud Quantitative Analysis Trading System',
    short_name: 'YYC3',
    description: 'Professional quantitative trading system with AI-powered analysis',
    start_url: '/',
    display: 'standalone',
    background_color: '#071425',
    theme_color: '#071425',
    orientation: 'any',
    icons: [
      {
        src: '/yyc3-pwa-icon.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/yyc3-pwa-icon.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };

  const link = document.createElement('link');
  link.rel = 'manifest';
  link.href = 'data:application/manifest+json;charset=utf-8,' + encodeURIComponent(JSON.stringify(manifest));
  document.head.appendChild(link);
}

// Inject PWA manifest
injectPWAManifest();

// Render the app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);