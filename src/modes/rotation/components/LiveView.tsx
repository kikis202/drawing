import { useEffect, useRef } from 'preact/hooks';
import * as THREE from 'three';
import type { FormMesh } from '../../../geometry/types';
import { FormScene } from '../../../render/form-scene';
import type { RenderOptions } from '../../../render/render-options';
import { viewLabel } from '../../../views/label';
import type { View } from '../../../views/types';

/** Beyond this many pixels a press is a drag, not a tap. */
const TAP_SLOP = 6;

interface Props {
  /** The panel on desktop; on phones a small floating square that expands to the full screen. */
  variant: 'panel' | 'floating' | 'full';
  onExpand: () => void;
  onCollapse: () => void;
  form: { mesh: FormMesh; version: number };
  view: View;
  render: RenderOptions;
  onDrag: (dxPx: number, dyPx: number) => void;
  onKey: (key: string, shift: boolean) => boolean;
  onDragStart: () => void;
  onCapture: () => void;
  /** The renderer could not get a WebGL 2 context. */
  onWebGLError: () => void;
}

/** The rotatable view on studio grey. Owns its own renderer and scene. */
export function LiveView({
  variant,
  onExpand,
  onCollapse,
  form,
  view,
  render,
  onDrag,
  onKey,
  onDragStart,
  onCapture,
  onWebGLError,
}: Props) {
  const frameRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const scene = useRef<FormScene | null>(null);
  const size = useRef({ w: 0, h: 0 });
  const latest = useRef({ view, render });
  latest.current = { view, render };
  const frame = useRef(0);
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null);

  // One setView + render per animation frame at most: setView reallocates line buffers.
  const schedule = useRef(() => {
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const r = renderer.current;
      const s = scene.current;
      const { w, h } = size.current;
      if (!r || !s || w === 0 || h === 0) return;
      s.setView(latest.current.view, w / h, Math.min(w, h), latest.current.render);
      r.render(s.scene, s.camera);
    });
  }).current;

  useEffect(() => {
    let r: THREE.WebGLRenderer;
    try {
      r = new THREE.WebGLRenderer({ canvas: canvasRef.current!, antialias: true });
    } catch {
      onWebGLError();
      return;
    }
    r.setPixelRatio(window.devicePixelRatio);
    r.setClearColor('#8F9398', 1);
    renderer.current = r;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const w = Math.round(width);
      const h = Math.round(height);
      size.current = { w, h };
      if (w === 0 || h === 0) return;
      r.setPixelRatio(window.devicePixelRatio);
      r.setSize(w, h, false);
      scene.current?.setResolution(w, h);
      schedule();
    });
    observer.observe(frameRef.current!);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      scene.current?.dispose();
      scene.current = null;
      r.dispose();
      r.forceContextLoss();
      renderer.current = null;
    };
  }, []);

  useEffect(() => {
    const s = new FormScene(form.mesh);
    const { w, h } = size.current;
    if (w && h) s.setResolution(w, h);
    scene.current = s;
    schedule();
    return () => {
      s.dispose();
      if (scene.current === s) scene.current = null;
    };
  }, [form.version]);

  useEffect(schedule, [view, render]);

  const onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY };
    // The floating square only takes taps; it never rotates the object.
    if (variant !== 'floating') onDragStart();
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId || variant === 'floating') return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (dx === 0 && dy === 0) return;
    drag.current = { ...d, x: e.clientX, y: e.clientY };
    onDrag(dx, dy);
  };
  const onPointerEnd = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    if (variant === 'floating' && e.type === 'pointerup' && moved < TAP_SLOP) onExpand();
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (variant === 'floating') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onExpand();
      }
      return;
    }
    if (variant === 'full' && e.key === 'Escape') {
      onCollapse();
      return;
    }
    if (onKey(e.key, e.shiftKey)) e.preventDefault();
  };

  return (
    <div class={`live live-${variant}`} ref={frameRef}>
      <canvas
        ref={canvasRef}
        class="live-canvas"
        role={variant === 'floating' ? 'button' : 'application'}
        tabIndex={0}
        aria-label={variant === 'floating' ? 'Expand live view' : 'Live view. Drag or use arrow keys to rotate'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onKeyDown={onKeyDown}
      />
      {variant === 'full' && (
        <button type="button" class="btn live-back" onClick={onCollapse}>
          Back to shots
        </button>
      )}
      {variant !== 'floating' && (
        <>
          <button type="button" class="btn live-capture" onClick={onCapture}>
            Capture view
          </button>
          <p class="live-readout" data-testid="live-readout">
            {viewLabel(view)}
          </p>
        </>
      )}
    </div>
  );
}
