import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { loadManifold } from '../../geometry/manifold';
import { FormScene } from '../../render/form-scene';
import { ShotRenderer } from '../../render/shot-renderer';
import type { RenderOptions } from '../../render/render-options';
import { applyDrag, applyKey, easeInOut, interpolateView } from '../../views/pose';
import type { Shot } from '../../views/types';
import { ContactSheet } from './components/ContactSheet';
import { Controls } from './components/Controls';
import { LiveView } from './components/LiveView';
import { TopBar } from './components/TopBar';
import { ShotImages, shotKey } from './shot-images';
import {
  allShots,
  captureView,
  keptShots,
  setLive,
  setPieces,
  setRender,
  setShotCount,
  toggleAllowed,
  toggleKeep,
} from './state';
import { createRotationStore } from './store';
import './rotation.css';

type Store = ReturnType<typeof createRotationStore>;

const SNAP_MS = 450;

function hasWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    // three.js needs WebGL 2.
    const gl = canvas.getContext('webgl2');
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
    return gl !== null;
  } catch {
    return false;
  }
}

export default function RotationMode() {
  const [status, setStatus] = useState<'loading' | 'failed' | 'no-webgl' | Store>('loading');

  useEffect(() => {
    if (!hasWebGL()) {
      setStatus('no-webgl');
      return;
    }
    let current = true;
    loadManifold()
      .then((wasm) => {
        if (!current) return;
        const store = createRotationStore(wasm);
        store.newObject();
        setStatus(store);
      })
      .catch(() => {
        if (current) setStatus('failed');
      });
    return () => {
      current = false;
    };
  }, []);

  if (status === 'loading') return <p class="rotation-message">Preparing shapes…</p>;
  if (status === 'failed')
    return (
      <p class="rotation-message" role="alert">
        Couldn't load the shape engine. Reload to try again.
      </p>
    );
  if (status === 'no-webgl')
    return (
      <p class="rotation-message" role="alert">
        This browser can't show 3D graphics. WebGL is turned off or not supported.
      </p>
    );
  return <RotationStudy store={status} onNoWebGL={() => setStatus('no-webgl')} />;
}

/** What a shot image shows; an image is only used for a tile whose tag still matches. */
const imageTag = shotKey;

interface Props {
  store: Store;
  onNoWebGL: () => void;
}

function RotationStudy({ store, onNoWebGL }: Props) {
  const s = store.state.value;
  const [images, setImages] = useState<ReadonlyMap<string, { url: string; tag: string }>>(new Map());
  const shotImages = useRef<ShotImages | null>(null);
  const requested = useRef<{ version: number; render: RenderOptions; shots: Shot[] } | null>(null);
  const snapFrame = useRef(0);

  useLayoutEffect(() => {
    // One shot renderer for the mode's lifetime: WebGL contexts are scarce.
    let renderer: ShotRenderer;
    try {
      renderer = new ShotRenderer();
    } catch {
      onNoWebGL();
      return;
    }
    let live = true;
    const queue = new ShotImages(renderer, (mesh) => new FormScene(mesh), (urls) => {
      const req = requested.current;
      if (!live || !req) return;
      const next = new Map<string, { url: string; tag: string }>();
      for (const shot of req.shots) {
        const url = urls.get(shot.id);
        if (url) next.set(shot.id, { url, tag: imageTag(req.version, req.render, shot.view) });
      }
      setImages(next);
    });
    shotImages.current = queue;
    return () => {
      live = false;
      cancelAnimationFrame(snapFrame.current);
      queue.dispose();
      renderer.dispose();
      shotImages.current = null;
    };
  }, []);

  // A layout effect, so the queue drops stale images before the browser paints.
  useLayoutEffect(() => {
    if (!s.form) return;
    const shots = allShots(s);
    requested.current = { version: s.form.version, render: s.settings.render, shots };
    shotImages.current?.update(s.form, shots, s.settings.render);
  }, [s.form, s.generated, s.custom, s.settings.render]);

  // Never hand a tile an image made for another view, form or hidden-lines setting,
  // even for the one render before the queue has caught up.
  const urls = new Map<string, string>();
  for (const shot of allShots(s)) {
    const image = images.get(shot.id);
    if (image && s.form && image.tag === imageTag(s.form.version, s.settings.render, shot.view)) {
      urls.set(shot.id, image.url);
    }
  }

  const cancelSnap = () => {
    cancelAnimationFrame(snapFrame.current);
    snapFrame.current = 0;
  };

  const snap = (shot: Shot) => {
    cancelSnap();
    const from = store.state.value.live;
    const to = shot.view;
    // Land exactly on the shot's view; interpolation at t = 1 can be off by float error.
    const land = () => store.dispatch(setLive, { ...to }, shot.id);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      land();
      return;
    }
    const start = performance.now();
    const step = (now: number) => {
      const t = (now - start) / SNAP_MS;
      if (t >= 1) {
        snapFrame.current = 0;
        land();
        return;
      }
      store.dispatch(setLive, interpolateView(from, to, easeInOut(Math.max(0, t))), null);
      snapFrame.current = requestAnimationFrame(step);
    };
    snapFrame.current = requestAnimationFrame(step);
  };

  const onDrag = (dx: number, dy: number) => {
    cancelSnap();
    store.dispatch(setLive, applyDrag(store.state.value.live, dx, dy), null);
  };

  const onKey = (key: string, shift: boolean) => {
    const next = applyKey(store.state.value.live, key, shift);
    if (!next) return false;
    cancelSnap();
    store.dispatch(setLive, next, null);
    return true;
  };

  const newObject = () => {
    cancelSnap();
    store.newObject();
  };

  if (!s.form) return null;

  return (
    <div class="rotation">
      <TopBar onNewObject={newObject} />
      <ContactSheet
        shots={allShots(s)}
        urls={urls}
        kept={s.kept}
        activeShotId={s.activeShotId}
        onSnap={snap}
        onToggleKeep={(id) => store.dispatch(toggleKeep, id)}
      />
      <aside class="rotation-side">
        <LiveView
          form={s.form}
          view={s.live}
          render={s.settings.render}
          onDrag={onDrag}
          onDragStart={cancelSnap}
          onWebGLError={onNoWebGL}
          onKey={onKey}
          onCapture={() => {
            cancelSnap();
            store.dispatch(captureView);
          }}
        />
        <Controls
          settings={s.settings}
          keptCount={keptShots(s).length}
          onToggleShape={(type) => store.dispatch(toggleAllowed, type)}
          onPieces={(n) => store.dispatch(setPieces, n)}
          onShotCount={(n) => {
            cancelSnap();
            store.dispatch(setShotCount, n);
          }}
          onHidden={(on) => store.dispatch(setRender, { hidden: on })}
          onSave={() => {
            // Saving arrives in a later task.
          }}
        />
      </aside>
    </div>
  );
}
