import { MagnifyingGlassIcon } from '@heroicons/react/16/solid';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';

import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Generative Relevance',
};

export default function RootLayout({ children }: React.PropsWithChildren) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <div className="h-screen relative">
          <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 px-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row items-center justify-between py-4">
                <div className="flex items-center space-x-3">
                  <MagnifyingGlassIcon className="w-8 h-8 text-blue-600" />
                  <h1 className="text-xl font-semibold text-gray-900 whitespace-nowrap">
                    Generative Relevance
                  </h1>
                </div>
              </div>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
