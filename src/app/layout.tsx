import { ReactNode } from 'react';

// Root layout is required for the App Router
// It should be a pass-through for [locale]/layout.tsx which provides html/body tags
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
