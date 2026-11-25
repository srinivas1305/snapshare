'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Hide chrome in fullscreen projector slideshow mode
  if (pathname?.endsWith('/slideshow')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-neutral-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link
            href="/"
            className="flex items-center gap-2.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 rounded"
          >
            <span className="w-6 h-6 bg-neutral-900 rounded flex items-center justify-center text-white text-[11px] font-mono font-bold tracking-tight">
              S
            </span>
            <span className="text-sm font-display font-semibold tracking-tight text-neutral-900">
              SnapShare
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className={`text-sm px-3 py-1.5 rounded transition-colors duration-150 ${
                    pathname === '/dashboard'
                      ? 'text-neutral-900 font-medium bg-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/occasions/new"
                  className={`text-sm px-3 py-1.5 rounded transition-colors duration-150 ${
                    pathname === '/occasions/new'
                      ? 'text-neutral-900 font-medium bg-neutral-100'
                      : 'text-neutral-500 hover:text-neutral-900'
                  }`}
                >
                  New occasion
                </Link>
                <span className="w-px h-4 bg-neutral-200 mx-2.5" aria-hidden="true" />
                <span className="text-xs font-mono text-neutral-500 truncate max-w-[160px]">
                  {session.user?.name}
                </span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs text-neutral-400 hover:text-neutral-900 ml-3 transition-colors duration-150"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm text-neutral-600 hover:text-neutral-900 px-3 py-1.5 rounded transition-colors duration-150"
                >
                  Log in
                </Link>
                <Link href="/register" className="btn-primary ml-2">
                  Get started
                </Link>
              </>
            )}
          </nav>

          <button
            onClick={() => setOpen(!open)}
            aria-label="Toggle navigation"
            className="sm:hidden flex items-center justify-center w-8 h-8 text-neutral-600 hover:text-neutral-900"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
              {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div className="sm:hidden border-t border-neutral-200 bg-white px-4 py-3 space-y-1">
          {session ? (
            <>
              <Link
                href="/dashboard"
                onClick={() => setOpen(false)}
                className="block text-sm text-neutral-700 hover:text-neutral-900 py-1.5"
              >
                Dashboard
              </Link>
              <Link
                href="/occasions/new"
                onClick={() => setOpen(false)}
                className="block text-sm text-neutral-700 hover:text-neutral-900 py-1.5"
              >
                New occasion
              </Link>
              <div className="border-t border-neutral-100 mt-2 pt-2 flex items-center justify-between">
                <span className="text-xs text-neutral-400 font-mono">{session.user?.name}</span>
                <button
                  onClick={() => signOut({ callbackUrl: '/' })}
                  className="text-xs text-red-600 hover:text-red-700 py-1"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="block text-sm text-neutral-700 hover:text-neutral-900 py-1.5"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="block text-sm font-medium text-accent hover:text-accent-hover py-1.5"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
