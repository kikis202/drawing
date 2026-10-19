import { beforeAll, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import type { ManifoldToplevel } from 'manifold-3d';
import { buildForm } from '../../../src/geometry/build-form';
import type { FormMesh } from '../../../src/geometry/types';
import { FormScene } from '../../../src/render/form-scene';
import { cameraPosition, fovForAspect } from '../../../src/views/camera';
import { getTestManifold } from '../../helpers/manifold';

let mesh: FormMesh;
beforeAll(async () => {
  const wasm: ManifoldToplevel = await getTestManifold();
  mesh = buildForm(wasm, {
    version: 1,
    seed: 0,
    pieces: [{ type: 'cube', size: [1, 1, 1], rotation: [0, 0, 0], position: [0, 0, 0], op: 'add' }],
  });
});

function lineMaterials(fs: FormScene) {
  const lines = fs.scene.children.filter((c) => (c as { isLineSegments2?: boolean }).isLineSegments2);
  expect(lines).toHaveLength(2);
  const [visible, hidden] = lines as unknown as { material: any; visible: boolean }[];
  return { visible, hidden };
}

describe('FormScene', () => {
  it('places the camera for the view', () => {
    const fs = new FormScene(mesh);
    const view = { turn: 45, tilt: 30 };
    fs.setView(view, 1, 400, false);
    const [x, y, z] = cameraPosition(view);
    expect(fs.camera.position.x).toBeCloseTo(x);
    expect(fs.camera.position.y).toBeCloseTo(y);
    expect(fs.camera.position.z).toBeCloseTo(z);
  });

  it('uses the aspect-corrected FOV', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 0, tilt: 0 }, 0.5, 400, false);
    expect(fs.camera.fov).toBeCloseTo(fovForAspect(0.5));
    expect(fs.camera.aspect).toBeCloseTo(0.5);
  });

  it('treats a zero-size canvas as aspect 1', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 0, tilt: 0 }, 0, 400, false);
    expect(Number.isFinite(fs.camera.fov)).toBe(true);
    expect(fs.camera.fov).toBeCloseTo(fovForAspect(1));
  });

  it('hidden pass is dashed blue behind surfaces and toggles', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 0, tilt: 0 }, 1, 400, false);
    const { hidden } = lineMaterials(fs);
    expect(hidden.material.dashed).toBe(true);
    expect(hidden.material.depthFunc).toBe(THREE.GreaterDepth);
    expect(hidden.material.color.getHexString()).toBe('3e95d1');
    expect(hidden.visible).toBe(false);
    fs.setView({ turn: 0, tilt: 0 }, 1, 400, true);
    expect(hidden.visible).toBe(true);
  });

  it('scales line width with frame size', () => {
    const fs = new FormScene(mesh);
    const { visible } = lineMaterials(fs);
    const width = (px: number) => {
      fs.setView({ turn: 0, tilt: 0 }, 1, px, false);
      return visible.material.linewidth;
    };
    expect(width(150)).toBeCloseTo(1.25);
    expect(width(600)).toBeCloseTo(2);
    expect(width(1200)).toBeCloseTo(3);
  });

  it('camera stays finite at the tilt limit', () => {
    const fs = new FormScene(mesh);
    fs.setView({ turn: 123, tilt: 89 }, 1, 400, false);
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
});
