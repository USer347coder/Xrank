import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Leaderboard from './pages/Leaderboard';
import CardPage from './pages/CardPage';
import RenderCard from './pages/RenderCard';
import MyVault from './pages/MyVault';
import PublicVault from './pages/PublicVault';
import { useEffect } from 'react';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Render-only route (no Layout shell — clean for Playwright) */}
        <Route path="/render/card/:snapshotId" element={<RenderCard />} />

        {/* All other routes with Layout shell */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/card/:snapshotId" element={<CardPage />} />
          <Route path="/vault" element={<MyVault />} />
          <Route path="/vault/:username" element={<PublicVault />} />
          <Route path="/profile/:username" element={<PublicVault />} />
          <Route
            path="/@:username"
            element={
              <PublicVaultRedirect />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function PublicVaultRedirect() {
  const { username } = useParams();
  const navigate = useNavigate();
  useEffect(() => {
    if (username) {
      navigate(`/profile/${username.replace(/^@/, '')}`, { replace: true });
    }
  }, [username, navigate]);
  return null;
}
