import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { type StudioGame, api } from '../lib/studio';
import {
  type DeskHandle,
  type DeskState,
  createDeskGame,
  deskStandalone,
} from '../runtime/desk-game';
export function PlayPage() {
  const { gameId } = useParams<{
    gameId: string;
  }>();
  const [game, setGame] = useState<StudioGame | null>(null);
  const [error, setError] = useState('');
  const [state, setState] = useState<DeskState | null>(null);
  const [muted, setMuted] = useState(true);
  const [exporting, setExporting] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);
  const runtime = useRef<DeskHandle | null>(null);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let cancelled = false;
    api<StudioGame>(`/games/${encodeURIComponent(gameId ?? '')}`)
      .then((data) => {
        if (!cancelled) setGame(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);
  useEffect(() => {
    if (!game || !canvas.current) return;
    const handle = createDeskGame(canvas.current, game, setState);
    runtime.current = handle;
    return () => {
      handle.destroy();
      runtime.current = null;
    };
  }, [game]);
  useEffect(() => runtime.current?.mute(muted), [muted, game]);
  const focus = () => canvas.current?.focus();
  const play = () => {
    if (state?.status === 'paused') runtime.current?.resume();
    else runtime.current?.start();
    focus();
  };
  const restart = () => {
    runtime.current?.restart();
    focus();
  };
  async function download() {
    if (!game) return;
    setExporting(true);
    try {
      const html = deskStandalone(game);
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'SnapQuest-System-Override.html';
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } finally {
      setExporting(false);
    }
  }
  if (error)
    return (
      <div className="empty-state">
        <h1>We couldn’t open that world.</h1>
        <p>{error}</p>
        <Link to="/upload" className="btn btn-primary">
          Back to studio <Icon name="arrow" />
        </Link>
      </div>
    );
  if (!game)
    return (
      <div className="empty-state">
        <span className="loading-spark">✳</span>
        <p>Connecting to your desktop universe…</p>
      </div>
    );
  return (
    <div className="play-page desk-play">
      <div className="play-heading">
        <div>
          <Link className="back-link" to="/gallery">
            ← My arcade
          </Link>
          <div className="play-title-row">
            <h1>{game.title}</h1>
            <span className="tag">DESKTOP ACTION ADVENTURE</span>
          </div>
          <p>{game.subtitle}</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={download} disabled={exporting}>
          <Icon name="download" size={17} />
          {exporting ? 'Packing…' : 'Download offline game'}
        </button>
      </div>
      <div className="game-frame" ref={container}>
        <div className="game-toolbar">
          <span>
            <span className="status-dot" />
            {state?.status === 'won'
              ? 'ALL SYSTEMS RESTORED'
              : state?.status === 'paused'
                ? 'SYSTEM ON STANDBY'
                : 'A REAL DESK. AN UNREAL ADVENTURE.'}
          </span>
          <div>
            <button
              type="button"
              className="icon-button"
              aria-label={muted ? 'Turn sound on' : 'Mute sound'}
              onClick={() => {
                setMuted(!muted);
                focus();
              }}
            >
              <Icon name="volume" size={17} />
              <span>{muted ? 'Off' : 'On'}</span>
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Restart game"
              onClick={restart}
            >
              <Icon name="reset" size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label={state?.status === 'paused' ? 'Resume game' : 'Pause game'}
              onClick={() => {
                if (state?.status === 'playing') runtime.current?.pause();
                else play();
              }}
            >
              <Icon name={state?.status === 'paused' ? 'play' : 'pause'} size={17} />
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Enter fullscreen"
              onClick={() => {
                void container.current?.requestFullscreen().catch(() => {});
              }}
            >
              <Icon name="expand" size={17} />
            </button>
          </div>
        </div>
        <div className="canvas-wrap desk-canvas">
          <canvas
            ref={canvas}
            tabIndex={0}
            aria-label="System Override action game. WASD to move, Space to fire, E for sonic pulse or remote, Shift to dash. Recover 5 USB drives, activate the remote, and defeat the Shadow Laptop."
          />
          {(state?.status === 'ready' || state?.status === 'paused') && (
            <button type="button" className="btn btn-primary game-start desk-start" onClick={play}>
              <Icon name="play" size={19} />
              {state.status === 'ready' ? 'Jack into your world' : 'Resume mission'}
            </button>
          )}
          {state?.status === 'lost' && (
            <button
              type="button"
              className="btn btn-primary game-start desk-retry"
              onClick={restart}
            >
              <Icon name="reset" size={18} />
              Try another run
            </button>
          )}
        </div>
        <div className="game-bottom-bar">
          <span>
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> move <span className="controls-divider" />
            <kbd>SPACE</kbd> auto-aim fire <span className="controls-divider" />
            <kbd>E</kbd> pulse / interact <span className="controls-divider" />
            <kbd>SHIFT</kbd> dash
          </span>
          <span className="game-live-stats" aria-live="polite">
            {state?.recovered ?? 0}/5 data <span>·</span>
            {state?.kills ?? 0} bugs purged
          </span>
        </div>
      </div>
      <div className="touch-controls desk-touch" aria-label="Touch game controls">
        {[
          ['ArrowLeft', '←'],
          ['ArrowUp', '↑'],
          ['ArrowDown', '↓'],
          ['ArrowRight', '→'],
          ['Space', 'Fire'],
          ['KeyE', 'Pulse / E'],
        ].map(([key, label]) => (
          <button
            type="button"
            key={key}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              runtime.current?.input(key!, true);
            }}
            onPointerUp={() => runtime.current?.input(key!, false)}
            onPointerCancel={() => runtime.current?.input(key!, false)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="scene-story">
        <div className="scene-story-intro">
          <span className="micro-label mint">THIS IS WHAT YOUR PHOTO BECAME</span>
          <h2>
            Nothing on this desk
            <br />
            is just an object.
          </h2>
          <p>
            A corrupted laptop. A cursor with a mission. A speaker that fights back. Every mechanic
            has a real-world origin.
          </p>
        </div>
        <div className="object-role-grid">
          {[
            [
              '▱',
              'Laptops',
              'Home base & final boss',
              'The silver terminal is corrupted. Break its shield and reboot the network.',
              'laptop',
            ],
            [
              '⌁',
              'Audio cables',
              'Living enemies',
              'Cable bugs chase you. Fire data pulses to stop them.',
              'cables',
            ],
            [
              '▥',
              'Speaker',
              'Sonic weapon',
              'Press E to unleash a radial blast. Recharges in nine seconds.',
              'speaker',
            ],
            [
              '⊞',
              'USB drives',
              'Recovery data',
              'Find all five before you can disable the terminal’s firewall.',
              'usb',
            ],
            [
              '⊕',
              'Power brick',
              'Repair station',
              'Stand near the charger to restore two health points.',
              'charger',
            ],
            [
              '⋮',
              'Remote & pens',
              'Switch & barriers',
              'After recovering the data, approach the remote and press E. Pens shape your route.',
              'remote',
            ],
          ].map(([symbol, source, role, copy, id]) => (
            <div className={`object-role role-${id}`} key={id}>
              <span className="role-symbol">{symbol}</span>
              <div>
                <span className="micro-label">{source}</span>
                <h3>{role}</h3>
                <p>{copy}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="next-world">
        <p>Your photograph wrote the rules.</p>
        <Link className="text-link" to="/upload">
          Back to the photo studio <Icon name="arrow" size={17} />
        </Link>
      </div>
      <p className="mode-disclosure">
        This desk demo uses curated object labels and procedural illustrations. No segmentation
        model or live inference is required. The object-to-mechanic mapping is included with the
        game.
      </p>
    </div>
  );
}
