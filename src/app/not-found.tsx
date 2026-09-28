import Link from 'next/link';
import React from 'react';

// Root not-found page must be static and not use next-intl hooks
// to avoid "useContext" errors during build time for /_not-found
export default function NotFound() {
  return (
    <html lang="ar">
      <head>
        <title>404 - Not Found</title>
      </head>
      <body style={{ margin: 0, backgroundColor: '#f8fafc' }}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '100vh',
          color: '#0f172a',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '20px'
        }}>
          <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
          <p style={{ fontSize: '1.2rem', marginBottom: '2rem' }}>الصفحة غير موجودة / Page Not Found</p>
          <Link href="/ar" style={{
            backgroundColor: '#0d9488',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            textDecoration: 'none',
            fontWeight: 'bold'
          }}>
            العودة للرئيسية / Home
          </Link>
        </div>
      </body>
    </html>
  );
}
