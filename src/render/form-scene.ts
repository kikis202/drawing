import * as THREE from 'three';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import type { FormMesh } from '../geometry/types';
import type { View } from '../views/types';
import { cameraPosition, fovForAspect } from '../views/camera';
import { buildEdgeAdjacency, creaseSegments, silhouetteSegments } from './edges';
import type { EdgeAdjacency } from './edges';

const CREASE_DEG = 30;

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
  private readonly meshMaterial: THREE.MeshLambertMaterial;
  private readonly lineGeometry = new LineSegmentsGeometry();
  private readonly visibleMaterial: LineMaterial;
  private readonly hiddenMaterial: LineMaterial;
  private readonly hiddenLines: LineSegments2;

  constructor(mesh: FormMesh) {
    const base = new THREE.BufferGeometry();
    base.setAttribute('position', new THREE.BufferAttribute(mesh.positions, 3));
    base.setIndex(new THREE.BufferAttribute(mesh.indices, 1));
    this.meshGeometry = toCreasedNormals(base, (CREASE_DEG * Math.PI) / 180);
    base.dispose();
    this.meshMaterial = new THREE.MeshLambertMaterial({
      color: '#D5D9DD',
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.scene.add(new THREE.Mesh(this.meshGeometry, this.meshMaterial));

    this.adjacency = buildEdgeAdjacency(mesh);
    this.creases = creaseSegments(this.adjacency, CREASE_DEG);

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
    this.scene.add(new LineSegments2(this.lineGeometry, this.visibleMaterial));
    this.hiddenLines = new LineSegments2(this.lineGeometry, this.hiddenMaterial);
    this.hiddenLines.visible = false;
    this.scene.add(this.hiddenLines);

    // Lighting is fixed relative to the camera.
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8a8f95', 1.1));
    const key = new THREE.DirectionalLight('#ffffff', 2.0);
    key.position.set(-1.2, 1.5, 1);
    key.target = new THREE.Object3D();
    this.scene.add(key.target);
    this.camera.add(key);
    this.scene.add(this.camera);
  }

  setView(view: View, aspect: number, framePx: number, hidden: boolean): void {
    const a = aspect > 0 ? aspect : 1;
    const pos = cameraPosition(view);
    const { camera } = this;
    camera.position.set(...pos);
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    camera.fov = fovForAspect(a);
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
    this.hiddenLines.visible = hidden;
  }

  setResolution(widthPx: number, heightPx: number): void {
    this.visibleMaterial.resolution.set(widthPx, heightPx);
    this.hiddenMaterial.resolution.set(widthPx, heightPx);
  }

  dispose(): void {
    this.meshGeometry.dispose();
    this.meshMaterial.dispose();
    this.lineGeometry.dispose();
    this.visibleMaterial.dispose();
    this.hiddenMaterial.dispose();
  }
}
