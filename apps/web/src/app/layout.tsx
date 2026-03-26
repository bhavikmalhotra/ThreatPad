import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ThreatPad',
  description: 'Collaborative threat intelligence note-taking platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('threatpad-theme');if(t==='light')document.documentElement.classList.remove('dark')}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
