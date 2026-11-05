import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { api } from '../lib/studio';
interface Job {
  status: string;
  gameId: string;
  errorCode?: string;
  stageTimingsMs: Record<string, number>;
}
const stages = [
  ['segmenting', 'Discovering the details', 'Finding visual regions in your photo.'],
  ['designing', 'Connecting the dots', 'Giving everyday objects game rules and roles.'],
  [
    'painting',
    'Bringing your objects to life',
    'Preparing your scene and its illustrated game components.',
  ],
  ['building', 'Putting the world together', 'Saving your playable world.'],
];
export function ProgressPage() {
  const { jobId } = useParams<{
    jobId: string;
  }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const result = await api<Job>(`/jobs/${encodeURIComponent(jobId ?? '')}`);
        if (cancelled) return;
        setJob(result);
        setError('');
        if (result.status === 'playable') {
          timer = setTimeout(
            () => navigate(`/play/${result.gameId ?? jobId}`, { replace: true }),
            900,
          );
          return;
        }
        if (result.status === 'failed') return;
        timer = setTimeout(poll, 600);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Connection interrupted.');
          timer = setTimeout(poll, 2000);
        }
      }
    }
    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [jobId, navigate]);
  const ready = job?.status === 'playable';
  const failed = job?.status === 'failed';
  const current = stages.findIndex((s) => s[0] === job?.status);
  return (
    <div className="progress-page">
      <div className="page-kicker">
        <Icon name="spark" size={16} /> THE WORLD IN BETWEEN
      </div>
      <h1>
        {ready
          ? 'Your world is ready.'
          : failed
            ? 'Let’s give it another go.'
            : 'A little world is taking shape.'}
      </h1>
      <p className="section-description">
        {ready
          ? 'The ordinary is about to become an adventure.'
          : 'Your objects are becoming characters, tools, enemies and objectives.'}
      </p>
      <div className="generation-layout">
        <div className="generation-photo">
          <img
            src={`/games/${jobId}/photo`}
            alt="Source photograph being transformed into a game"
          />
          <div className={`scan-line ${ready || failed ? 'finished' : ''}`} />
          <span className="photo-badge">{ready ? 'WORLD COMPLETE' : 'BUILDING YOUR WORLD'}</span>
        </div>
        <div className="generation-steps">
          {stages.map(([id, title, copy], i) => {
            const done = ready || job?.stageTimingsMs[id!] !== undefined;
            return (
              <div
                className={`generation-step ${done ? 'done' : current === i ? 'current' : ''}`}
                key={id}
              >
                <div className="generation-step-icon">
                  {done ? (
                    <Icon name="check" size={17} />
                  ) : (
                    <span>{String(i + 1).padStart(2, '0')}</span>
                  )}
                </div>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
                <span className="generation-time">
                  {done ? `${job?.stageTimingsMs[id!] ?? 0} ms` : current === i ? 'Working…' : ''}
                </span>
              </div>
            );
          })}
          <div className="generation-note">
            <span className="status-dot" />
            {ready
              ? 'Saved locally. Opening your game…'
              : 'Model-free generation · Your photo stays local'}
          </div>
        </div>
      </div>
      {error && (
        <div className="inline-error" role="alert">
          {error}
        </div>
      )}
      {failed && (
        <div className="inline-error" role="alert">
          This photo could not be processed. Please try a different JPEG, PNG or WebP image.
        </div>
      )}
      <div className="progress-actions">
        {ready && (
          <Link className="btn btn-primary" to={`/play/${jobId}`}>
            Enter your world <Icon name="arrow" />
          </Link>
        )}
        <Link className="text-link" to="/upload">
          ← Back to studio
        </Link>
      </div>
    </div>
  );
}
