'use client';

import { usePathname } from 'next/navigation';
import UserMenu from './UserMenu';

/**
 * Global header that shows UserMenu (avatar when signed in, passkey button when not)
 * Hidden on pages that have their own header with UserMenu (home, board view)
 */
export default function GlobalHeader() {
  const pathname = usePathname();
  
  // Hide on pages that have their own UserMenu in header
  const isHomePage = pathname === '/';
  const isBoardPage = pathname?.startsWith('/board/');
  
  if (isHomePage || isBoardPage) {
    return null;
  }
  
  return (
    <header className="border-b border-[var(--border)] bg-[rgba(248,246,242,0.9)] backdrop-blur-xl sticky top-0 z-50 shadow-[0_8px_24px_rgba(17,17,17,0.04)]">
      <div className="max-w-full mx-auto px-6 py-3 flex justify-end items-center">
        <UserMenu />
      </div>
    </header>
  );
}