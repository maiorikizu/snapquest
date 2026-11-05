export interface Region {
  label: string;
  box: number[];
}
export interface PhotoLevel {
  version: number;
  seed: number;
  width: number;
  height: number;
  floor: number;
  spawn: {
    x: number;
    y: number;
  };
  platforms: {
    x: number;
    y: number;
    w: number;
    h: number;
    region: number;
    label: string;
  }[];
  collectibles: {
    id: number;
    x: number;
    y: number;
  }[];
  hazards: {
    x: number;
    min: number;
    max: number;
  }[];
  goal: {
    x: number;
    y: number;
  };
  physics: {
    gravity: number;
    jumpVelocity: number;
    speed: number;
    doubleJump: boolean;
  };
}
export interface StudioGame {
  id: string;
  title: string;
  subtitle: string;
  family: string;
  createdAt: string;
  seed: number;
  regions: Region[];
  sprites: string[];
  level: PhotoLevel;
  tint: number[];
  photoUrl: string;
  segmentationMode: string;
  generationMs: number;
  scene?: {
    theme: string;
    source: string;
    premise: string;
    objects: {
      source: string;
      role: string;
      art: string;
      mechanic: string;
    }[];
  };
}
export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let body: { data?: T; error?: { message?: string } };
  try {
    body = await response.json();
  } catch {
    throw new Error('The studio server is unavailable. Start it with pnpm dev.');
  }
  if (!response.ok) throw new Error(body.error?.message ?? `Request failed (${response.status}).`);
  return (body.data ?? body) as T;
}
export function uploadResult(body: unknown): {
  jobId: string;
} {
  const envelope = body as {
    data?: {
      jobId?: unknown;
    };
    jobId?: unknown;
  };
  const id = envelope?.data?.jobId ?? envelope?.jobId;
  if (typeof id !== 'string' || !id.startsWith('job_'))
    throw new Error('The server returned an invalid upload response. Please retry.');
  return { jobId: id };
}
