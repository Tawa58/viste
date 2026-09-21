import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Viste High School Management System',
  description: 'School operations console for academics, attendance, fees, and staff.',
  icons: {
    icon: [
      { url: '/favicon.png', type: 'image/png' },
      { url: '/icon.png', type: 'image/png' },
    ],
    apple: [{ url: '/apple-icon.png', type: 'image/png' }],
    shortcut: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Manrope:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  var KEY = 'viste.chunk-reload';
  function shouldReload(msg) {
    return typeof msg === 'string' && (
      msg.indexOf('ChunkLoadError') !== -1 ||
      msg.indexOf('Loading chunk') !== -1 ||
      msg.indexOf('Failed to fetch dynamically imported module') !== -1 ||
      msg.indexOf('error loading dynamically imported module') !== -1
    );
  }
  function reloadOnce() {
    try {
      var n = Number(sessionStorage.getItem(KEY) || '0');
      if (n >= 2) return;
      sessionStorage.setItem(KEY, String(n + 1));
    } catch (e) {}
    try {
      var url = new URL(window.location.href);
      url.searchParams.set('_r', String(Date.now()));
      window.location.replace(url.toString());
    } catch (e) {
      window.location.reload();
    }
  }
  window.addEventListener('error', function (ev) {
    if (shouldReload((ev && ev.message) || '')) reloadOnce();
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev && ev.reason;
    var msg = r && (r.message || String(r));
    if (shouldReload(msg || '')) reloadOnce();
  });
})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
