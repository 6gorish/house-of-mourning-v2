import type { Metadata } from 'next';
import Link from 'next/link';
import { Inter, Playfair_Display, Cormorant_Garamond, EB_Garamond, Cinzel, Bodoni_Moda } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['400', '600', '700'],
  display: 'swap',
});

// Logo font options - uncomment ONE to try different styles:

// Option 1: Cormorant Garamond (elegant, refined, literary)
// const logoFont = Cormorant_Garamond({
//   subsets: ['latin'],
//   variable: '--font-logo',
//   weight: ['300', '400', '600'],
//   display: 'swap',
// });

// Option 2: EB Garamond (classic, timeless, book typography)
// const logoFont = EB_Garamond({
//   subsets: ['latin'],
//   variable: '--font-logo',
//   weight: ['400', '600'],
//   display: 'swap',
// });

// Option 3: Cinzel (architectural, formal, Roman inscriptions)
const logoFont = Cinzel({
  subsets: ['latin'],
  variable: '--font-logo',
  weight: ['400', '600'],
  display: 'swap',
});

// Option 4: Bodoni Moda (high contrast, fashion-forward, luxurious)
// const logoFont = Bodoni_Moda({
//   subsets: ['latin'],
//   variable: '--font-logo',
//   weight: ['400', '600'],
//   display: 'swap',
// });

export const metadata: Metadata = {
  title: 'The House of Mourning',
  description: 'An exhibition exploring grief through contemporary sacred aesthetics.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${logoFont.variable}`}>
      <body className="font-sans antialiased">
        {/* Navigation */}
        <nav className="border-b border-stone-200 bg-stone-50/95 backdrop-blur-sm sticky top-0 z-50 transition-elegant">
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-4 md:py-6">
            <div className="flex items-center justify-between">
              {/* Site title */}
              <Link 
                href="/" 
                className="group relative"
              >
                <span className="text-2xl md:text-3xl font-light tracking-tight text-stone-900 
                               transition-all duration-300 ease-out
                               group-hover:text-stone-600
                               relative inline-block"
                      style={{ fontFamily: 'var(--font-logo)' }}>
                  The House of Mourning
                  {/* Elegant underline on hover */}
                  <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-stone-900 
                               transition-all duration-500 ease-out
                               group-hover:w-full"></span>
                </span>
              </Link>

              {/* Nav links - desktop */}
              <div className="hidden md:flex items-center gap-8">
                <Link href="/about" className="nav-link">
                  About
                </Link>
                <Link href="/artists" className="nav-link">
                  Artists
                </Link>
                <Link href="/event" className="nav-link">
                  Event
                </Link>
                <Link href="/participate" className="btn-primary">
                  Share Your Grief
                </Link>
              </div>

              {/* Mobile menu button */}
              <button className="md:hidden text-stone-900 hover:text-sky-700 transition-smooth p-2 -mr-2 text-2xl">
                ☰
              </button>
            </div>
          </div>
        </nav>

        {children}

        {/* Footer */}
        <footer className="border-t border-stone-200 bg-stone-50">
          <div className="max-w-6xl mx-auto px-6 md:px-12 py-16 md:py-24">
            <div className="grid md:grid-cols-2 gap-12 md:gap-16">
              {/* Contact */}
              <div>
                <h3 className="text-xl md:text-2xl font-serif font-light tracking-tight mb-6">Contact</h3>
                <div className="space-y-2">
                  <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                    Email: <a href="mailto:twoflaneurs.com@gmail.com" className="hover:text-sky-700 transition-smooth">twoflaneurs.com@gmail.com</a>
                  </p>
                  <p className="text-sm md:text-base text-stone-500 leading-relaxed mt-4">
                    For inquiries about the exhibition, accessibility needs, or media requests, please email us.
                  </p>
                </div>
              </div>

              {/* Exhibition Info */}
              <div>
                <h3 className="text-xl md:text-2xl font-serif font-light tracking-tight mb-6">Exhibition</h3>
                <div className="space-y-2">
                  <p className="text-sm md:text-base text-stone-600 leading-relaxed">December 19-20, 2025</p>
                  <p className="text-sm md:text-base text-stone-600 leading-relaxed">
                    Truss House at RiNo Art Park<br />
                    3400 Arkins Ct<br />
                    Denver, CO 80216
                  </p>
                  <p className="text-xs md:text-sm text-stone-500 mt-6 tracking-wide uppercase">
                    Supported by RiNo Arts District
                  </p>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div className="mt-16 pt-8 border-t border-stone-200 text-center">
              <p className="text-xs md:text-sm text-stone-500 tracking-wide uppercase">
                © 2025 Two Flaneurs. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
