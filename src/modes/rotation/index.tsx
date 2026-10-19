import { useEffect, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { loadManifold } from '../../geometry/manifold';
import { FormScene } from '../../render/form-scene';
import { ShotRenderer } from '../../render/shot-renderer';
import type { RenderOptions } from '../../render/render-options';
import { planColumns } from '../../views/patterns';
import { applyDrag, applyKey, easeInOut, interpolateView } from '../../views/pose';
import type { Shot } from '../../views/types';
import { BottomSheet } from './components/BottomSheet';
import { ContactSheet } from './components/ContactSheet';
import { CustomisePanel } from './components/CustomisePanel';
import { ExercisePanel } from './components/ExercisePanel';
import { LiveView } from './components/LiveView';
import { PhoneBar } from './components/PhoneBar';
import { ShotsPanel } from './components/ShotsPanel';
import { TopBar } from './components/TopBar';
import { ShotImages, shotKey } from './shot-images';
import {
  allShots,
  captureView,
  keptShots,
  reveal,
  setHideOne,
  setLevel,
  setLive,
  setPlan,
  setRender,
  setStyle,
  startFromLive,
  toggleAllowed,
  toggleJoin,
  toggleKeep,
} from './state';
import { createRotationStore } from './store';
import { useIsPhone } from './use-phone';
import './rotation.css';

type Store = ReturnType<typeof createRotationStore>;

const SNAP_MS = 450;
/** The Grid pattern can't fit more than this many columns across a phone. */
const PHONE_MAX_COLUMNS = 2;
/** Phones fit two columns of at least this size before the sheet scrolls. */
const PHONE_MIN_TILE = 150;

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
  const phone = useIsPhone();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  /** Generating replaces the shots, so a snap in flight would land on a shot that's gone. */
  const regenerate = (make: () => void) => {
    cancelSnap();
    make();
  };

  if (!s.form) return null;
  const { settings } = s;
  const { start } = settings.plan.sequence;
  const startIsLive = start.turn === s.live.turn && start.tilt === s.live.tilt;
  const keptCount = keptShots(s).length;

  const columns = planColumns(settings.plan);
  const newObject = () => regenerate(store.newObject);
  const save = () => {
    // Saving arrives in a later task.
  };

  const liveView = (variant: 'panel' | 'floating' | 'full') => (
    <LiveView
      variant={variant}
      onExpand={() => setExpanded(true)}
      onCollapse={() => setExpanded(false)}
      form={s.form!}
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
  );

  const panels = (
    <>
      <ExercisePanel
        selected={settings.exercise}
        canVary={s.form.spec.style === 'clean'}
        onApply={(id) => regenerate(() => store.applyExercise(id))}
        onVariation={() => regenerate(store.variation)}
        onNewObject={newObject}
      />
      <ShotsPanel
        plan={settings.plan}
        render={settings.render}
        onPlan={(patch) => store.dispatch(setPlan, patch, Math.random())}
        onStartFromLive={() => {
          if (!startIsLive) store.dispatch(startFromLive, Math.random());
        }}
        onRender={(patch) => store.dispatch(setRender, patch)}
      />
      <CustomisePanel
        settings={settings}
        onStyle={(style) => store.dispatch(setStyle, style)}
        onLevel={(level) => store.dispatch(setLevel, level)}
        onToggleShape={(type) => store.dispatch(toggleAllowed, type)}
        onToggleJoin={(join) => store.dispatch(toggleJoin, join)}
        onLens={(lens) => store.dispatch(setRender, { lens })}
        onTopMap={(on) => store.dispatch(setPlan, { topMap: on }, Math.random())}
        onHideOne={(on) => store.dispatch(setHideOne, on, Math.random())}
      />
    </>
  );

  return (
    <div class={`rotation${phone ? ' rotation-phone' : ''}`}>
      <TopBar onNewObject={phone ? newObject : undefined} />
      <ContactSheet
        shots={allShots(s)}
        urls={urls}
        kept={s.kept}
        activeShotId={s.activeShotId}
        hiddenShotId={s.revealed ? null : s.hiddenShotId}
        columns={phone && columns !== null ? Math.min(columns, PHONE_MAX_COLUMNS) : columns}
        minTile={phone ? PHONE_MIN_TILE : undefined}
        onSnap={snap}
        onToggleKeep={(id) => store.dispatch(toggleKeep, id)}
        onReveal={() => store.dispatch(reveal)}
      />
      {phone ? (
        <>
          {liveView(expanded ? 'full' : 'floating')}
          <PhoneBar keptCount={keptCount} onSettings={() => setSettingsOpen(true)} onSave={save} />
          <BottomSheet open={settingsOpen} title="Settings" onClose={() => setSettingsOpen(false)}>
            {panels}
          </BottomSheet>
        </>
      ) : (
        <aside class="rotation-side">
          {liveView('panel')}
          <div class="panel">{panels}</div>
          <div class="panel-save">
            <button type="button" class="btn btn-primary save" disabled={keptCount === 0} onClick={save}>
              {keptCount === 1 ? 'Save 1 shot' : `Save ${keptCount} shots`}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}
