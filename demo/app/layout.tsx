import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Scout · Family exploration',
  description: 'Set family guidance, see Scout’s action summary, and let curiosity lead.',
  icons: { icon: '/favicon.svg' },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
