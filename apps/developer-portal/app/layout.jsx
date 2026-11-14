import './globals.css';

export const metadata = {
  metadataBase: new URL('https://developer.legendary.fun'),
  title: 'Developers — LEGENDARY',
  description: 'Integrator kit for Legendary.fun: native, Pump-shaped, and Meteora-shaped APIs. Existing DAP paths unchanged.',
  icons: { icon: '/lmeow-logo-v4.jpg' },
};

export const viewport = {
  themeColor: '#061225',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
