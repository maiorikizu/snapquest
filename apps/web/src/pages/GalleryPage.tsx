import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { type StudioGame, api } from '../lib/studio';
export function GalleryPage() {
  const [games, setGames] = useState<StudioGame[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    api<StudioGame[]>('/games')
      .then((data) => {
        if (!cancelled) setGames(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <div className="gallery-page">
      <div className="page-kicker">
        <Icon name="grid" size={16} /> YOUR COLLECTION OF LITTLE WORLDS
      </div>
      <div className="gallery-heading">
        <div>
          <h1>
            My arcade<span className="mint">.</span>
          </h1>
          <p className="section-description">Real places. New adventures. All yours to keep.</p>
        </div>
        <Link className="btn btn-primary" to="/upload">
          Create a world <Icon name="spark" size={18} />
        </Link>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {loading ? (
        <div className="empty-state">
          <span className="loading-spark">✳</span>
          <p>Finding your worlds…</p>
        </div>
      ) : games.length === 0 ? (
        <div className="arcade-empty">
          <span className="empty-orbit">✳</span>
          <h2>The next adventure is on your camera roll.</h2>
          <p>Your worlds will appear here after you create them. Bring a photo of your own.</p>
          <Link className="btn btn-primary" to="/upload">
            Discover your first world <Icon name="arrow" size={18} />
          </Link>
        </div>
      ) : (
        <>
          <div className="gallery-count">
            {games.length} {games.length === 1 ? 'WORLD' : 'WORLDS'} · SAVED ON THIS COMPUTER
          </div>
          <div className="gallery-grid">
            {games.map((game, i) => (
              <Link key={game.id} to={`/play/${game.id}`} className="arcade-card">
                <div className="arcade-photo">
                  <div
                    className="archive-illustration"
                    aria-label="Illustrated System Override game"
                  >
                    <span className="archive-label">SYSTEM OVERRIDE</span>
                    <span className="archive-laptop" />
                    <span className="archive-laptop second" />
                    <span className="archive-drone">↖</span>
                  </div>
                  <span className="arcade-number">WORLD {String(i + 1).padStart(2, '0')}</span>
                  <span className="arcade-play">
                    <Icon name="play" size={24} />
                  </span>
                </div>
                <div className="arcade-copy">
                  <span className="micro-label mint">DESKTOP ACTION ADVENTURE</span>
                  <h2>
                    {game.title}
                    <Icon name="arrow" size={22} />
                  </h2>
                  <p>5 USB drives · Desktop action adventure</p>
                  <span className="arcade-date">
                    {new Date(game.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </Link>
            ))}
            <Link className="arcade-new" to="/upload">
              <Icon name="spark" size={30} />
              <h2>A world waiting to happen.</h2>
              <span>
                Bring another photo <Icon name="arrow" size={17} />
              </span>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
