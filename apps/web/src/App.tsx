import { useEffect, useState } from 'react';
import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import { Icon } from './components/Icon';
import { GalleryPage } from './pages/GalleryPage';
import { PlayPage } from './pages/PlayPage';
import { ProgressPage } from './pages/ProgressPage';
import { UploadPage } from './pages/UploadPage';
export function App() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () =>
      fetch('/health')
        .then((r) => {
          setOnline(r.ok);
        })
        .catch(() => setOnline(false));
    void check();
    const interval = setInterval(check, 15000);
    return () => clearInterval(interval);
  }, []);
  return (
    <BrowserRouter>
      <div className="app-shell">
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <NavLink to="/" className="brand" aria-label="SnapQuest home">
            <span className="brand-mark">
              <Icon name="spark" size={24} />
            </span>
            snapquest<span className="brand-period">.</span>
          </NavLink>
          <nav aria-label="Main navigation">
            <NavLink to="/upload" className={({ isActive }) => (isActive ? 'active' : '')}>
              Create a world
            </NavLink>
            <NavLink to="/gallery">My arcade</NavLink>
          </nav>
          <a
            className="source-link"
            href="https://github.com/maiorikizu/snapquest"
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
          >
            <Icon name="code" size={19} />
          </a>
        </header>
        {online === false && (
          <div className="connection-banner" role="status">
            The local server is offline. Run <code>pnpm dev</code> from the project folder to
            reconnect.
          </div>
        )}
        <main id="main" className="main-content">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/progress/:jobId" element={<ProgressPage />} />
            <Route path="/play/:gameId" element={<PlayPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route
              path="*"
              element={
                <div className="empty-state">
                  <h1>A world yet to be discovered.</h1>
                  <NavLink className="btn btn-primary" to="/upload">
                    Back to the studio <Icon name="arrow" />
                  </NavLink>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
