import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FormMesh } from '../geometry/types';
import type { View } from '../views/types';
import { cameraPosition, fovForAspect } from '../views/camera';
import type { RenderOptions } from './render-options';
import { buildEdgeAdjacency, creaseSegments, silhouetteSegments } from './edges';
import type { EdgeAdjacency } from './edges';

const GROUND_COLOUR = '#CDD2D7';
const HORIZON_DISTANCE = 1000;
const HORIZON_HALF_WIDTH = 5000;

function lineGeometry(positions: ArrayLike<number>): LineSegmentsGeometry {
  const g = new LineSegmentsGeometry();
  g.setPositions(positions as number[] | Float32Array);
  return g;
}

/**
 * The box's 12 edges split by the camera: an edge is a back edge when both faces meeting at it
 * face away from the camera. A camera outside the box gives 9 front and 3 back edges.
 */
function boxEdges(
  min: readonly number[],
  max: readonly number[],
  cam: readonly number[],
): { front: number[]; back: number[] } {
  const front: number[] = [];
  const back: number[] = [];
  for (let axis = 0; axis < 3; axis++) {
    const [a, b] = [0, 1, 2].filter((i) => i !== axis);
    for (const sa of [0, 1]) {
      for (const sb of [0, 1]) {
        const faces = (i: number, hi: number) => (hi ? cam[i] > max[i] : cam[i] < min[i]);
        const isBack = !faces(a, sa) && !faces(b, sb);
        const p0 = [0, 0, 0];
        p0[a] = (sa ? max : min)[a];
        p0[b] = (sb ? max : min)[b];
        const p1 = [...p0];
        p0[axis] = min[axis];
        p1[axis] = max[axis];
        (isBack ? back : front).push(...p0, ...p1);
      }
    }
  }
  return { front, back };
}

function gridLines(y: number): number[] {
  const out: number[] = [];
  for (let i = -8; i <= 8; i++) {
    const t = i * 0.25;
    out.push(t, y, -2, t, y, 2, -2, y, t, 2, y, t);
  }
  return out;
}

/**
 * Shaded form with graphite outlines and optional dashed hidden lines. Shared by the
 * shot renderer and the live view (each owns its own instance), so both frame identically.
 */
export class FormScene {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera();

  private readonly adjacency: EdgeAdjacency;
  private readonly creases: Float32Array;
  private readonly meshGeometry: THREE.BufferGeometry;
  private readonly shadedMaterial: THREE.MeshLambertMaterial;
  private readonly flatMaterial: THREE.MeshBasicMaterial;
  private readonly surface: THREE.Mesh;
  private readonly lineGeometry = new LineSegmentsGeometry();
  private readonly visibleMaterial: LineMaterial;
  private readonly hiddenMaterial: LineMaterial;
  private readonly visibleLines: LineSegments2;
  private readonly hiddenLines: LineSegments2;
  private readonly boxMin: readonly number[];
  private readonly boxMax: readonly number[];
  private readonly boxLines: LineSegments2;
  private readonly boxHiddenLines: LineSegments2;
  private readonly centreLines: LineSegments2;
  private readonly groundLines: LineSegments2;
  private readonly horizon: LineSegments2;
  private readonly horizonGeometry = new LineSegmentsGeometry();
  private readonly aidGeometries: LineSegmentsGeometry[] = [];
  private readonly aidMaterials: LineMaterial[] = [];

  constructor(mesh: FormMesh) {
    const base = new THREE.BufferGeometry();
    base.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    base.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    this.meshGeometry = toCreasedNormals(base, (mesh.creaseDeg * Math.PI) / 180);
    base.dispose();
    // Steep enough that wide line quads at concave creases don't fail the depth test and
    // show as a blue hidden-line fringe beside the visible line.
    const offset = {
      polygonOffset: true,
      polygonOffsetFactor: 3,
      polygonOffsetUnits: 1,
    };
    this.shadedMaterial = new THREE.MeshLambertMaterial({
      color: '#D5D9DD',
      ...offset,
    });
    // Unlit material for Lines only (white) and Silhouette (graphite); recoloured per mode.
    this.flatMaterial = new THREE.MeshBasicMaterial({
      color: '#FFFFFF',
      ...offset,
    });
    // Explicit draw order: surface, then hidden lines (depth-tested against the surface only),
    // then visible lines on top. Without it three sorts by material id.
    this.surface = new THREE.Mesh(this.meshGeometry, this.shadedMaterial);
    this.surface.renderOrder = 0;
    this.scene.add(this.surface);

    this.adjacency = buildEdgeAdjacency(mesh);
    this.creases = creaseSegments(this.adjacency, mesh.creaseDeg);

    this.visibleMaterial = new LineMaterial({ color: '#26292D', linewidth: 2 });
    this.hiddenMaterial = new LineMaterial({
      color: '#3E95D1',
      linewidth: 1.5,
      dashed: true,
      dashSize: 0.06,
      gapSize: 0.045,
      depthFunc: THREE.GreaterDepth,
      depthWrite: false,
    });
    this.visibleLines = new LineSegments2(this.lineGeometry, this.visibleMaterial);
    this.visibleLines.renderOrder = 2;
    this.scene.add(this.visibleLines);
    this.hiddenLines = new LineSegments2(this.lineGeometry, this.hiddenMaterial);
    this.hiddenLines.renderOrder = 1;
    this.hiddenLines.visible = false;
    this.scene.add(this.hiddenLines);

    const hiddenDashed = (color: string) =>
      this.aidMaterial({
        color,
        linewidth: 1,
        dashed: true,
        dashSize: 0.06,
        gapSize: 0.045,
        depthTest: false,
        depthWrite: false,
      });
    const aid = (g: LineSegmentsGeometry, m: LineMaterial, order: number) => {
      const l = new LineSegments2(g, m);
      l.renderOrder = order;
      l.visible = false;
      this.scene.add(l);
      return l;
    };
    // The box encloses the form, so its front edges can't be occluded and its back edges are
    // classified from the camera, not by depth. Both passes draw under the form's visible lines.
    this.boxMin = mesh.bounds.min;
    this.boxMax = mesh.bounds.max;
    const initial = boxEdges(this.boxMin, this.boxMax, [Infinity, Infinity, Infinity]);
    this.boxLines = aid(
      this.aidGeometry(lineGeometry(initial.front)),
      this.aidMaterial({
        color: '#5E646B',
        linewidth: 1,
        depthTest: false,
        depthWrite: false,
      }),
      1.5,
    );
    this.boxHiddenLines = aid(
      this.aidGeometry(lineGeometry(initial.back)),
      hiddenDashed('#5E646B'),
      0.5,
    );
    this.centreLines = aid(
      this.aidGeometry(lineGeometry(mesh.axes)),
      this.aidMaterial({ color: '#3E95D1', linewidth: 1, depthTest: false }),
      3,
    );
    this.groundLines = aid(
      this.aidGeometry(lineGeometry(gridLines(mesh.bounds.min[1]))),
      this.aidMaterial({
        color: GROUND_COLOUR,
        linewidth: 1,
        depthWrite: false,
      }),
      -1,
    );
    this.horizon = aid(
      this.aidGeometry(this.horizonGeometry),
      this.aidMaterial({
        color: GROUND_COLOUR,
        linewidth: 1,
        depthWrite: false,
      }),
      -1,
    );

    // Lighting is fixed relative to the camera.
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f95', 1.1));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    // Key from the upper left, about 38° off the view axis. The target is camera-relative too,
    // so the angle holds for every view.
    key.position.set(-1.2, 1.5, 1);
    key.target = new THREE.Object3D();
    key.target.position.set(0, 0, -1.5);
    this.camera.add(key.target);
    this.camera.add(key);
    this.scene.add(this.camera);
  }

  private aidGeometry(g: LineSegmentsGeometry): LineSegmentsGeometry {
    this.aidGeometries.push(g);
    return g;
  }

  private aidMaterial(params: ConstructorParameters<typeof LineMaterial>[0]): LineMaterial {
    const m = new LineMaterial(params);
    this.aidMaterials.push(m);
    return m;
  }

  setView(view: View, aspect: number, framePx: number, opts: RenderOptions): void {
    const a = aspect > 0 ? aspect : 1;
    const pos = cameraPosition(view, opts.lens);
    const { camera } = this;
    camera.position.set(...pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.fov = fovForAspect(a, opts.lens);
    camera.far = 3000; // the horizon sits 1000 units out
    camera.aspect = a;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    const sil = silhouetteSegments(this.adjacency, pos);
    const all = new Float32Array(this.creases.length + sil.length);
    all.set(this.creases);
    all.set(sil, this.creases.length);
    this.lineGeometry.setPositions(all);
    this.hiddenLines.computeLineDistances();

    const w = Math.min(3, Math.max(1.25, framePx / 300));
    this.visibleMaterial.linewidth = w;
    this.hiddenMaterial.linewidth = 0.75 * w;

    const silhouette = opts.mode === 'silhouette';
    this.surface.material = opts.mode === 'shaded' ? this.shadedMaterial : this.flatMaterial;
    this.flatMaterial.color.set(silhouette ? '#26292D' : '#FFFFFF');
    this.visibleLines.visible = !silhouette;
    this.hiddenLines.visible = opts.hidden && !silhouette;

    const aidWidth = 0.6 * w;
    this.boxLines.material.linewidth = aidWidth;
    this.boxHiddenLines.material.linewidth = 0.75 * aidWidth;
    this.centreLines.material.linewidth = aidWidth;
    this.boxLines.visible = opts.box;
    if (opts.box) this.updateBox(pos);
    this.boxHiddenLines.visible = opts.box && opts.hidden && !silhouette;
    this.centreLines.visible = opts.centreLines;
    this.groundLines.visible = opts.ground;
    this.horizon.visible = opts.ground;
    this.horizon.material.linewidth = aidWidth;
    if (opts.ground) this.updateHorizon(pos);
  }

  private updateBox(pos: readonly number[]): void {
    const { front, back } = boxEdges(this.boxMin, this.boxMax, pos);
    this.boxLines.geometry.setPositions(front);
    this.boxHiddenLines.geometry.setPositions(back);
    this.boxHiddenLines.computeLineDistances();
  }

  /** One segment at camera height, ahead along the horizontal forward direction, across the view. */
  private updateHorizon(pos: readonly number[]): void {
    let fx = -pos[0];
    let fz = -pos[2];
    const len = Math.hypot(fx, fz);
    if (len < 1e-9) [fx, fz] = [0, -1];
    else [fx, fz] = [fx / len, fz / len];
    const cx = pos[0] + fx * HORIZON_DISTANCE;
    const cz = pos[2] + fz * HORIZON_DISTANCE;
    const sx = -fz * HORIZON_HALF_WIDTH;
    const sz = fx * HORIZON_HALF_WIDTH;
    this.horizonGeometry.setPositions([cx - sx, pos[1], cz - sz, cx + sx, pos[1], cz + sz]);
  }

  setResolution(widthPx: number, heightPx: number): void {
    this.visibleMaterial.resolution.set(widthPx, heightPx);
    this.hiddenMaterial.resolution.set(widthPx, heightPx);
    for (const m of this.aidMaterials) m.resolution.set(widthPx, heightPx);
  }

  dispose(): void {
    this.meshGeometry.dispose();
    this.shadedMaterial.dispose();
    this.flatMaterial.dispose();
    this.lineGeometry.dispose();
    this.visibleMaterial.dispose();
    this.hiddenMaterial.dispose();
    for (const g of this.aidGeometries) g.dispose();
    for (const m of this.aidMaterials) m.dispose();
  }
}
