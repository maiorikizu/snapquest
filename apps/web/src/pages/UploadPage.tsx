import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { uploadResult } from '../lib/studio';

export function UploadPage() {
  const navigate = useNavigate();
  const picker = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  function selectFile(selected: File | undefined) {
    if (!selected) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
      setError('Choose a JPEG, PNG or WebP photo.');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('Choose a photo under 10 MB.');
      return;
    }
    setFile(selected);
    setConsent(false);
  }
  async function upload() {
    if (!file || !consent || busy) return;
    setBusy(true);
    setProgress(0);
    setError('');
    const form = new FormData();
    form.append('photo', file);
    form.append('consent', 'agree-processing-v1');
    try {
      const result = await new Promise<{ jobId: string }>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/jobs');
        xhr.timeout = 60000;
        xhr.setRequestHeader('idempotency-key', `upload_${crypto.randomUUID()}`);
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 100));
        };
        xhr.onload = () => {
          try {
            const body = JSON.parse(xhr.responseText);
            if (xhr.status < 200 || xhr.status >= 300)
              throw new Error(body.error?.message ?? 'Upload failed.');
            resolve(uploadResult(body));
          } catch (err) {
            reject(err);
          }
        };
        xhr.onerror = () => reject(new Error('Cannot reach the studio. Start it with pnpm dev.'));
        xhr.ontimeout = () => reject(new Error('The upload timed out. Try a smaller image.'));
        xhr.send(form);
      });
      navigate(`/progress/${result.jobId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
      setBusy(false);
    }
  }
  return (
    <div className="upload-home">
      <div className="page-kicker">
        <Icon name="spark" size={16} /> REAL LIFE. REIMAGINED.
      </div>
      <div className="upload-home-grid">
        <section className="upload-home-intro">
          <h1>
            Start with a photo.
            <br />
            Make room for <em>play.</em>
          </h1>
          <p>
            Your world is the starting point.
            <br />
            Choose a photograph and create your next little adventure.
          </p>
          <div className="privacy-points">
            <div>
              <Icon name="photo" />
              <span>Your image, your choice</span>
            </div>
            <div>
              <Icon name="scan" />
              <span>Processed on your computer</span>
            </div>
            <div>
              <Icon name="play" />
              <span>Play and save in your arcade</span>
            </div>
          </div>
          <span className="home-note">A blank canvas. A world of possibilities.</span>
        </section>
        <section className="upload-card" aria-label="Create a game from your image">
          <div className="card-topline">
            <span>
              <span className="step-number">01</span> Bring your own world
            </span>
            <span className="micro-label">JPG / PNG / WEBP</span>
          </div>
          <input
            ref={picker}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Choose a photograph"
            className="sr-only"
            disabled={busy}
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <button
            type="button"
            className={`drop-area ${dragging ? 'dragging' : ''}`}
            disabled={busy}
            onClick={() => picker.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (!busy) selectFile(event.dataTransfer.files[0]);
            }}
          >
            <span className="upload-icon">
              <Icon name={file ? 'check' : 'upload'} size={28} />
            </span>
            <strong>{file ? file.name : 'Drop a photo. Discover a world.'}</strong>
            <span>
              {file ? (
                `${(file.size / 1024 / 1024).toFixed(1)} MB · Click to choose another photo`
              ) : (
                <>
                  or <u>browse files</u> · up to 10 MB
                </>
              )}
            </span>
          </button>
          {file && (
            <label className="consent-row">
              <input
                type="checkbox"
                checked={consent}
                disabled={busy}
                onChange={(event) => setConsent(event.target.checked)}
              />
              <span>Allow SnapQuest to process and save this photo locally to make my game.</span>
            </label>
          )}
          {error && (
            <div className="inline-error" role="alert">
              {error}
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary btn-full"
            disabled={!file || !consent || busy}
            onClick={upload}
            data-testid="upload-button"
          >
            {busy ? `Creating your world… ${progress}%` : 'Create my game'}
            <Icon name="arrow" size={18} />
          </button>
          <div className="card-footnote">
            <span className="status-dot" />
            Your uploads stay on this computer.
          </div>
        </section>
      </div>
      <div className="upload-home-bottom">
        <span>PHOTO</span>
        <i />
        <span>DISCOVER</span>
        <i />
        <span>CREATE</span>
        <i />
        <span>PLAY</span>
      </div>
    </div>
  );
}
