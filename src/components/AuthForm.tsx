import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function AuthForm({ onAuthed }: { onAuthed?: () => void }) {
  const { user, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    setMsg(null);
    setLoading(true);
    const { error } = await signIn(email, pw);
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg('Signed in!');
    onAuthed?.();
  }

  async function handleSignUp() {
    setMsg(null);
    setLoading(true);
    const { error } = await signUp(email, pw);
    setLoading(false);
    if (error) return setMsg(error.message);
    setMsg('Account created. You may need to verify your email.');
    onAuthed?.();
  }

  if (user) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
        <div className="text-xs font-bold tracking-[0.18em] opacity-70 mb-2">LOGGED IN</div>
        <div className="text-sm font-mono opacity-80 truncate">{user.email}</div>
        <button
          onClick={() => { signOut(); setMsg(null); }}
          className="mt-3 px-4 py-2 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition"
        >
          SIGN OUT
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="text-xs font-bold tracking-[0.18em] opacity-90 mb-1">AUTH</div>
      <div className="text-xs opacity-50 mb-4">Login to save cards to your vault.</div>

      <div className="space-y-3">
        <input
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-white/15 bg-black/30 text-white text-sm outline-none focus:border-white/30 transition placeholder:opacity-40"
        />
        <input
          type="password"
          placeholder="password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-white/15 bg-black/30 text-white text-sm outline-none focus:border-white/30 transition placeholder:opacity-40"
          onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
        />

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleSignIn}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition disabled:opacity-40"
          >
            {loading ? '...' : 'SIGN IN'}
          </button>
          <button
            onClick={handleSignUp}
            disabled={loading}
            className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 text-xs font-bold tracking-[0.14em] hover:bg-white/10 transition disabled:opacity-40"
          >
            SIGN UP
          </button>
        </div>

        {msg && (
          <div className="text-xs font-mono opacity-70 mt-2">{msg}</div>
        )}
      </div>
    </div>
  );
}
