import type { FormScene } from '../../render/form-scene';
import type { FormMesh } from '../../geometry/types';
import type { Shot, View } from '../../views/types';

export interface ShotSource {
  render(form: FormScene, view: View, hidden: boolean): Promise<Blob>;
}

interface Entry {
  blob: Blob;
  url?: string;
}

interface Demand {
  shot: Shot;
  resolve: (b: Blob) => void;
  reject: (e: unknown) => void;
}

const keyOf = (version: number, hidden: boolean, v: View) =>
  `${version}|${hidden}|${v.turn}|${v.tilt}`;

/**
 * Turns shots into PNG object URLs, one render at a time. Results are cached per form
 * version, hidden-lines setting and view; anything from an older version or setting is
 * discarded, so a stale image is never reported.
 */
export class ShotImages {
  private version = -1;
  private hidden = false;
  private scene: FormScene | null = null;
  private shots: Shot[] = [];
  private readonly entries = new Map<string, Entry>();
  private readonly demands: Demand[] = [];
  /** Bumped whenever cached results become invalid; in-flight renders compare against it. */
  private epoch = 0;
  private running = false;
  /** Keys whose render threw this epoch; not retried until the cache is invalidated. */
  private readonly failed = new Set<string>();
  private lastEmitted = new Map<string, string>();

  private readonly source: ShotSource;
  private readonly makeScene: (m: FormMesh) => FormScene;
  private readonly onChange: (urls: ReadonlyMap<string, string>) => void;

  constructor(
    source: ShotSource,
    makeScene: (m: FormMesh) => FormScene,
    onChange: (urls: ReadonlyMap<string, string>) => void,
  ) {
    this.source = source;
    this.makeScene = makeScene;
    this.onChange = onChange;
  }

  update(form: { mesh: FormMesh; version: number }, shots: Shot[], hidden: boolean): void {
    if (form.version !== this.version) {
      this.scene?.dispose();
      this.scene = this.makeScene(form.mesh);
      this.version = form.version;
      this.invalidate();
    }
    if (hidden !== this.hidden) {
      this.hidden = hidden;
      this.invalidate();
    }
    this.shots = shots;

    const wanted = new Set(shots.map((s) => this.key(s)));
    for (const [key, entry] of this.entries) {
      if (!wanted.has(key)) {
        this.revoke(entry);
        this.entries.delete(key);
      } else if (!entry.url) {
        entry.url = URL.createObjectURL(entry.blob);
      }
    }
    this.emit();
    void this.pump();
  }

  /** The cached render for the current form and hidden setting; rendered on demand if missing. */
  blob(shot: Shot): Promise<Blob> {
    const cached = this.entries.get(this.key(shot));
    if (cached) return Promise.resolve(cached.blob);
    if (!this.scene) return Promise.reject(new Error('ShotImages has no form'));
    return new Promise<Blob>((resolve, reject) => {
      this.demands.push({ shot, resolve, reject });
      void this.pump();
    });
  }

  dispose(): void {
    this.invalidate();
    this.scene?.dispose();
    this.scene = null;
    this.shots = [];
  }

  private key(shot: Shot): string {
    return keyOf(this.version, this.hidden, shot.view);
  }

  private invalidate(): void {
    this.epoch++;
    for (const entry of this.entries.values()) this.revoke(entry);
    this.entries.clear();
    this.failed.clear();
    for (const d of this.demands.splice(0)) d.reject(new Error('superseded'));
  }

  private revoke(entry: Entry): void {
    if (entry.url) URL.revokeObjectURL(entry.url);
  }

  private emit(): void {
    const urls = new Map<string, string>();
    for (const shot of this.shots) {
      const url = this.entries.get(this.key(shot))?.url;
      if (url) urls.set(shot.id, url);
    }
    const same =
      urls.size === this.lastEmitted.size &&
      [...urls].every(([id, url]) => this.lastEmitted.get(id) === url);
    if (same) return;
    this.lastEmitted = urls;
    this.onChange(urls);
  }

  private next(): { shot: Shot; demand?: Demand } | null {
    for (const d of this.demands) {
      if (!this.entries.has(this.key(d.shot))) return { shot: d.shot, demand: d };
    }
    const shot = this.shots.find((s) => !this.entries.has(this.key(s)) && !this.failed.has(this.key(s)));
    return shot ? { shot } : null;
  }

  private settleDemands(): void {
    for (let i = this.demands.length - 1; i >= 0; i--) {
      const entry = this.entries.get(this.key(this.demands[i].shot));
      if (entry) this.demands.splice(i, 1)[0].resolve(entry.blob);
    }
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      this.settleDemands();
      for (let job = this.next(); job; job = this.next()) {
        const { epoch, scene, hidden } = this;
        if (!scene) break;
        const key = this.key(job.shot);
        let blob: Blob;
        try {
          blob = await this.source.render(scene, job.shot.view, hidden);
        } catch (e) {
          if (epoch !== this.epoch) continue;
          if (job.demand) {
            this.demands.splice(this.demands.indexOf(job.demand), 1);
            job.demand.reject(e);
            continue;
          }
          this.failed.add(key);
          console.error('Shot render failed', e);
          continue;
        }
        if (epoch !== this.epoch) continue;
        const listed = this.shots.some((s) => this.key(s) === key);
        this.entries.set(key, { blob, url: listed ? URL.createObjectURL(blob) : undefined });
        this.settleDemands();
        this.emit();
      }
    } finally {
      this.running = false;
    }
  }
}
