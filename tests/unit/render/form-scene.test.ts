import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildForm } from '../../../src/geometry/build-form';
import type { FormMesh } from '../../../src/geometry/types';
import { FormScene } from '../../../src/render/form-scene';
import { cameraPosition, fovForAspect, lensDistance } from '../../../src/views/camera';
import { DEFAULT_RENDER } from '../../../src/render/render-options';
import type { RenderOptions } from '../../../src/render/render-options';
import { getTestManifold } from '../../helpers/manifold';

let mesh: FormMesh;
beforeAll(async () => {
  const wasm: ManifoldToplevel = await getTestManifold();
  mesh = buildForm(wasm, {
    version: 2,
    style: 'freeform',
    seed: 0,
    pieces: [{ type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
  });
});

function lineMaterials(fs: FormScene) {
  // The form's own passes are added first; aids follow.
  const [visible, hidden] = allLines(fs).slice(0, 2);
  return { visible, hidden };
}

type Line = { material: any; geometry: any; visible: boolean; renderOrder: number };
function allLines(fs: FormScene): Line[] {
  return fs.scene.children.filter((c) => (c as { isLineSegments2?: boolean }).isLineSegments2) as unknown as Line[];
}
const VIEW = { turn: 0, tilt: 0 };
const hex = (l: Line) => l.material.color.getHexString();
const surfaceOf = (fs: FormScene) => fs.scene.children.find((c) => (c as { isMesh?: boolean }).isMesh) as THREE.Mesh;
const withOpts = (o: Partial<RenderOptions>): RenderOptions => ({ ...DEFAULT_RENDER, ...o });
function endpoints(l: Line): number[] {
  return Array.from(l.geometry.getAttribute('instanceStart').data.array as Float32Array);
}

const HIDDEN: RenderOptions = { ...DEFAULT_RENDER, hidden: true };

describe('FormScene', () => {
  it('applies the lens to fov and distance', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 45, tilt: 30 }, 1, 400, { ...DEFAULT_RENDER, lens: 'wide' });
    expect(fs.camera.fov).toBeCloseTo(55);
    expect(fs.camera.position.length()).toBeCloseTo(lensDistance('wide'));
  });


  it('places the camera for the view', () => {
    const fs = new FormScene(mesh);
    const view = { turn: 45, tilt: 30 };
    fs.setView(view, 1, 400, DEFAULT_RENDER);
    const [x, y, z] = cameraPosition(view);
    expect(fs.camera.position.x).toBeCloseTo(x);
    expect(fs.camera.position.y).toBeCloseTo(y);
    expect(fs.camera.position.z).toBeCloseTo(z);
  });

  it('uses the aspect-corrected FOV', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 0, tilt: 0 }, 0.5, 400, DEFAULT_RENDER);
    expect(fs.camera.fov).toBeCloseTo(fovForAspect(0.5));
    expect(fs.camera.aspect).toBeCloseTo(0.5);
  });

  it('treats a zero-size canvas as aspect 1', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 0, tilt: 0 }, 0, 400, DEFAULT_RENDER);
    expect(Number.isFinite(fs.camera.fov)).toBe(true);
    expect(fs.camera.fov).toBeCloseTo(fovForAspect(1));
  });

  it('hidden pass is dashed blue behind surfaces and toggles', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 0, tilt: 0 }, 1, 400, DEFAULT_RENDER);
    const { hidden } = lineMaterials(fs);
    expect(hidden.material.dashed).toBe(true);
    expect(hidden.material.depthFunc).toBe(THREE.GreaterDepth);
    expect(hidden.material.color.getHexString()).toBe('3e95d1');
    expect(hidden.visible).toBe(false);
    fs.setView({ turn: 0, tilt: 0 }, 1, 400, HIDDEN);
    expect(hidden.visible).toBe(true);
  });

  it('scales line width with frame size', () => {
    const fs = new FormScene(mesh);
    const { visible } = lineMaterials(fs);
    const width = (px: number) => {
      fs.setView({ turn: 0, tilt: 0 }, 1, px, DEFAULT_RENDER);
      return visible.material.linewidth;
    };
    expect(width(150)).toBeCloseTo(1.25);
    expect(width(600)).toBeCloseTo(2);
    expect(width(1200)).toBeCloseTo(3);
  });

  it('camera stays finite at the tilt limit', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 123, tilt: 89 }, 1, 400, DEFAULT_RENDER);
    const q = fs.camera.quaternion;
    for (const n of [q.x, q.y, q.z, q.w]) expect(Number.isFinite(n)).toBe(true);
  });

  it('draws surface, then hidden lines, then visible lines', () => {
    const fs = new FormScene(mesh);
    const surface = fs.scene.children.find((c) => (c as { isMesh?: boolean }).isMesh)!;
    const { visible, hidden } = lineMaterials(fs);
    const order = (o: unknown) => (o as { renderOrder: number }).renderOrder;
    expect(order(hidden)).toBeGreaterThan(order(surface));
    expect(order(visible)).toBeGreaterThan(order(hidden));
  });

  it('box aid adds 12 grey edges and a dashed pass only with hidden lines', () => {
    const fs = new FormScene(mesh);
    const [, , box, boxHidden] = allLines(fs);
    fs.setView(VIEW, 1, 400, DEFAULT_RENDER);
    expect(box.visible).toBe(false);
    fs.setView(VIEW, 1, 400, withOpts({ box: true }));
    expect(box.visible).toBe(true);
    expect(boxHidden.visible).toBe(false);
    expect(hex(box)).toBe('5e646b');
    expect(box.geometry.instanceCount).toBe(12);
    expect(box.material.linewidth).toBeCloseTo(0.6 * 1.3333, 2);
    fs.setView(VIEW, 1, 400, withOpts({ box: true, hidden: true }));
    expect(boxHidden.visible).toBe(true);
    expect(boxHidden.material.dashed).toBe(true);
    expect(boxHidden.material.depthFunc).toBe(THREE.GreaterDepth);
    expect(boxHidden.material.dashSize).toBe(0.06);
    expect(boxHidden.material.gapSize).toBe(0.045);
  });

  it('centre lines draw on top in blue', () => {
    const fs = new FormScene(mesh);
    const lines = allLines(fs);
    const centre = lines.find((l) => l.material.depthTest === false)!;
    fs.setView(VIEW, 1, 400, withOpts({ centreLines: true }));
    expect(centre.visible).toBe(true);
    expect(hex(centre)).toBe('3e95d1');
    expect(centre.renderOrder).toBeGreaterThan(lines[0].renderOrder);
    fs.setView(VIEW, 1, 400, DEFAULT_RENDER);
    expect(centre.visible).toBe(false);
  });

  it("ground grid sits at the form's lowest point", () => {
    const fs = new FormScene(mesh);
    const ground = allLines(fs).filter((l) => hex(l) === 'cdd2d7');
    expect(ground).toHaveLength(2);
    fs.setView(VIEW, 1, 400, withOpts({ ground: true }));
    const grid = ground.find((l) => l.geometry.instanceCount > 1)!;
    const p = endpoints(grid);
    for (let i = 1; i < p.length; i += 3) expect(p[i]).toBeCloseTo(mesh.bounds.min[1]);
    expect(Math.min(...p.filter((_, i) => i % 3 === 0))).toBeCloseTo(-2);
    expect(Math.max(...p.filter((_, i) => i % 3 === 2))).toBeCloseTo(2);
    expect(grid.visible).toBe(true);
    fs.setView(VIEW, 1, 400, DEFAULT_RENDER);
    expect(grid.visible).toBe(false);
  });

  it('horizon sits at camera height, far ahead, across the view', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 30, tilt: 20 }, 1, 400, withOpts({ ground: true }));
    const horizon = allLines(fs).find((l) => hex(l) === 'cdd2d7' && l.geometry.instanceCount === 1)!;
    const [ax, ay, az, bx, by, bz] = endpoints(horizon);
    const cam = fs.camera.position;
    expect(ay).toBeCloseTo(cam.y, 3);
    expect(by).toBeCloseTo(cam.y, 3);
    const mx = (ax + bx) / 2 - cam.x;
    const mz = (az + bz) / 2 - cam.z;
    expect(Math.hypot(mx, mz)).toBeCloseTo(1000, 1);
    expect(((bx - ax) * mx + (bz - az) * mz) / (Math.hypot(bx - ax, bz - az) * 1000)).toBeCloseTo(0, 4);
    expect(fs.camera.far).toBeGreaterThanOrEqual(3000);
  });

  it('lines mode uses an unlit white surface', () => {
    const fs = new FormScene(mesh);
    fs.setView(VIEW, 1, 400, withOpts({ mode: 'lines' }));
    const m = surfaceOf(fs).material as THREE.MeshBasicMaterial;
    expect(m.isMeshBasicMaterial).toBe(true);
    expect(m.color.getHexString()).toBe('ffffff');
    expect(m.polygonOffset).toBe(true);
    expect(lineMaterials(fs).visible.visible).toBe(true);
    fs.setView(VIEW, 1, 400, DEFAULT_RENDER);
    expect((surfaceOf(fs).material as THREE.MeshLambertMaterial).isMeshLambertMaterial).toBe(true);
  });

  it('silhouette mode hides form lines and fills graphite', () => {
    const fs = new FormScene(mesh);
    fs.setView(VIEW, 1, 400, withOpts({ mode: 'silhouette', hidden: true, box: true }));
    const m = surfaceOf(fs).material as THREE.MeshBasicMaterial;
    expect(m.color.getHexString()).toBe('26292d');
    const { visible, hidden } = lineMaterials(fs);
    expect(visible.visible).toBe(false);
    expect(hidden.visible).toBe(false);
    const [, , box, boxHidden] = allLines(fs);
    expect(box.visible).toBe(true);
    expect(boxHidden.visible).toBe(false);
    fs.setView(VIEW, 1, 400, withOpts({ mode: 'lines' }));
    expect(m.color.getHexString()).toBe('ffffff');
    expect(visible.visible).toBe(true);
  });

  it('dispose frees aid geometries and materials', () => {
    const fs = new FormScene(mesh);
    const lines = allLines(fs);
    const geoms = new Set(lines.map((l) => l.geometry));
    const mats = new Set(lines.map((l) => l.material));
    const count = { n: 0 };
    for (const o of [...geoms, ...mats]) {
      const orig = o.dispose.bind(o);
      o.dispose = () => { count.n++; orig(); };
    }
    fs.dispose();
    expect(count.n).toBe(geoms.size + mats.size);
    expect(geoms.size).toBe(5);
    expect(mats.size).toBe(7);
  });
});
