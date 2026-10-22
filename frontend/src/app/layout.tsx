import './globals.css';

export const metadata = {
  title: 'OmniAgent AI — Turn Any Website Into an Intelligent AI Assistant',
  description: 'Build AI-powered conversations, automate customer support, capture qualified leads, and deliver instant answers — all grounded in your own website.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){ try { var t = localStorage.getItem('omniagent_theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches))
              document.documentElement.classList.add('dark'); } catch(e){} })();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-[var(--bg)] text-[var(--text-1)] selection:bg-blue-500/20 antialiased">
        <main className="min-h-screen w-full">
          {children}
        </main>
      </body>
    </html>
  );
}
