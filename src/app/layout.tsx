import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Link from 'next/link';
import './globals.css';

import { MainLayout } from '@/components/MainLayout';

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'DocuLens — Intelligent Document Analysis',
  description: 'Intelligent document analysis that feels effortless. Frosted glass-morphic AI document grounding & alignment assistant.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${plusJakartaSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans selection:bg-indigo-500 selection:text-white bg-zinc-50">
        <MainLayout>
          {children}
        </MainLayout>
      </body>
    </html>
  );
}
