import type { Metadata } from 'next';
import { Inter, Playfair_Display, Cinzel, Cormorant_Garamond } from 'next/font/google';
import ClientLayoutWrapper from '@/components/ClientLayoutWrapper';
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

const logoFont = Cinzel({
  subsets: ['latin'],
  variable: '--font-logo',
  weight: ['400', '600'],
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  variable: '--font-cormorant',
  weight: ['300', '400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'The House of Mourning',
  description: 'An exhibition exploring grief through contemporary sacred aesthetics. December 19-20, 2025 at Truss House, Denver.',
  icons: {
    icon: '/favicon.svg',
  },
  openGraph: {
    title: 'The House of Mourning',
    description: 'Grief witnessed collectively through art, sound, and language. December 19-20, 2025 at Truss House, Denver.',
    url: 'https://thehouseofmourning.com',
    siteName: 'The House of Mourning',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'The House of Mourning Exhibition',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'The House of Mourning',
    description: 'Grief witnessed collectively through art, sound, and language. December 19-20, 2025.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable} ${logoFont.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased">
        <ClientLayoutWrapper>
          {children}
        </ClientLayoutWrapper>
      </body>
    </html>
  );
}
