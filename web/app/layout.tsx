import type { ReactNode } from 'react';

export const metadata = {
  title: 'Gaveta',
  description: 'Folders, search and export for your AI chats.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
