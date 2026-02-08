import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, loading, signInWithX, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#07080B] text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-xs font-black tracking-widest group-hover:border-white/25 transition">
              S
            </div>
            <span className="font-black tracking-[0.22em] text-sm hidden sm:inline">
              SOCIAL SCORE VAULT
            </span>
          </Link>

          <nav className="flex items-center gap-3 sm:gap-5 text-xs font-bold tracking-[0.16em]">
            <Link
              to="/leaderboard"
              className="opacity-70 hover:opacity-100 transition px-2 py-1"
            >
              RANKING BOARD
            </Link>

            {!loading && user ? (
              <>
                <Link
                  to="/vault"
                  className="opacity-70 hover:opacity-100 transition px-2 py-1"
                >
                  MY VAULT
                </Link>
                <button
                  onClick={signOut}
                  className="opacity-60 hover:opacity-100 transition px-2 py-1 text-red-400"
                >
                  SIGN OUT
                </button>
              </>
            ) : !loading ? (
              <button
                onClick={signInWithX}
                className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 hover:bg-white/10 transition flex items-center gap-2"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
                SIGN IN
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="mx-auto max-w-6xl px-4 pb-10 pt-4 text-xs opacity-40 tracking-wider">
        Social Score Vault &mdash; Mint &middot; Collect &middot; Rank &middot; 6 KPIs &middot; Score v1
      </footer>
    </div>
  );
}
