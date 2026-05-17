import './globals.css';
import React from 'react';

export const metadata = {
  title: 'AlignIntel - Standards Alignment & Lesson Revision Engine',
  description: 'An intelligent platform to verify curriculum standards alignment and automatically revise lesson plans.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body className="antialiased bg-[#030712] text-[#f3f4f6]">
        {children}
      </body>
    </html>
  );
}
