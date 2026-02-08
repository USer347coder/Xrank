import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { searchProfiles } from '../lib/api';

export default function Layout() {
  const { user, loading, signInWithX, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Array<{ username: string; display_name: string | null; avatar_url: string | null }>>([]);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const normalized = useMemo(() => query.trim().replace(/^@/, ''), [query]);

  useEffect(() => {
    let cancelled = false;
    if (normalized.length < 2) {
      setResults([]);
      return;
    }

    const t = setTimeout(async () => {
      try {
        const res = await searchProfiles(normalized, 10);
        if (!cancelled) setResults(res.profiles || []);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 180);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [normalized]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, []);

  function goToProfile(username: string) {
    const u = username.trim().replace(/^@/, '');
    if (!u) return;
    setOpen(false);
    navigate(`/@${u}`);
  }

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

          <div ref={rootRef} className="hidden md:block relative flex-1 mx-6 max-w-md">
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') goToProfile(normalized);
                if (e.key === 'Escape') setOpen(false);
              }}
              placeholder="Search profiles (@username)"
              className="w-full px-3.5 py-2 rounded-xl border border-white/12 bg-black/30 text-xs text-white outline-none focus:border-white/25 transition placeholder:opacity-40"
            />

            {open && (normalized.length >= 2) && (
              <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-white/10 bg-black/80 backdrop-blur-xl overflow-hidden">
                {results.length === 0 ? (
                  <button
                    onClick={() => goToProfile(normalized)}
                    className="w-full text-left px-4 py-3 text-xs opacity-70 hover:opacity-100 hover:bg-white/5 transition"
                  >
                    Go to `@{normalized}`
                  </button>
                ) : (
                  results.map((p) => (
                    <button
                      key={p.username}
                      onClick={() => goToProfile(p.username)}
                      className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition"
                    >
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-8 h-8 rounded-xl border border-white/10" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl border border-white/10 bg-white/[0.03]" />
                      )}
                      <div className="min-w-0">
                        <div className="text-xs font-bold tracking-[0.12em] opacity-90 truncate">
                          @{p.username}
                        </div>
                        {p.display_name && (
                          <div className="text-[11px] opacity-50 truncate">{p.display_name}</div>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

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
