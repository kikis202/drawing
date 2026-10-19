import type { FormMesh, Vec3 } from '../geometry/types';

export interface EdgeAdjacency {
  positions: Float32Array;
  /** Per edge: a, b (vertex indices), faceL, faceR (triangle indices). */
  edges: Uint32Array;
  /** Unit normal per triangle. */
  faceNormals: Float32Array;
  /** Vertex average per triangle. */
  faceCentres: Float32Array;
}

/** Throws if any edge does not border exactly two triangles. */
export function buildEdgeAdjacency(mesh: FormMesh): EdgeAdjacency {
  const { positions, indices } = mesh;
  const vertexCount = positions.length / 3;
  const faceCount = indices.length / 3;
  const faceNormals = new Float32Array(faceCount * 3);
  const faceCentres = new Float32Array(faceCount * 3);

  for (let f = 0; f < faceCount; f++) {
    const a = indices[f * 3] * 3;
    const b = indices[f * 3 + 1] * 3;
    const c = indices[f * 3 + 2] * 3;
    const e1x = positions[b] - positions[a];
    const e1y = positions[b + 1] - positions[a + 1];
    const e1z = positions[b + 2] - positions[a + 2];
    const e2x = positions[c] - positions[a];
    const e2y = positions[c + 1] - positions[a + 1];
    const e2z = positions[c + 2] - positions[a + 2];
    let nx = e1y * e2z - e1z * e2y;
    let ny = e1z * e2x - e1x * e2z;
    let nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz) || 1;
    nx /= len;
    ny /= len;
    nz /= len;
    faceNormals[f * 3] = nx;
    faceNormals[f * 3 + 1] = ny;
    faceNormals[f * 3 + 2] = nz;
    faceCentres[f * 3] = (positions[a] + positions[b] + positions[c]) / 3;
    faceCentres[f * 3 + 1] = (positions[a + 1] + positions[b + 1] + positions[c + 1]) / 3;
    faceCentres[f * 3 + 2] = (positions[a + 2] + positions[b + 2] + positions[c + 2]) / 3;
  }

  // key -> index of the edge's first slot in `found` (a, b, faceL, faceR)
  const slots = new Map<number, number>();
  const found: number[] = [];
  for (let f = 0; f < faceCount; f++) {
    for (let k = 0; k < 3; k++) {
      const u = indices[f * 3 + k];
      const v = indices[f * 3 + ((k + 1) % 3)];
      const lo = Math.min(u, v);
      const hi = Math.max(u, v);
      const key = lo * vertexCount + hi;
      const slot = slots.get(key);
      if (slot === undefined) {
        slots.set(key, found.length);
        found.push(lo, hi, f, -1);
      } else {
        if (found[slot + 3] !== -1) throw new Error('non-manifold edge');
        found[slot + 3] = f;
      }
    }
  }
  for (let i = 3; i < found.length; i += 4) {
    if (found[i] === -1) throw new Error('non-manifold edge');
  }

  return { positions, edges: Uint32Array.from(found), faceNormals, faceCentres };
}

function writeEdge(adj: EdgeAdjacency, e: number, out: Float32Array, o: number): void {
  const { positions, edges } = adj;
  const a = edges[e * 4] * 3;
  const b = edges[e * 4 + 1] * 3;
  out[o] = positions[a];
  out[o + 1] = positions[a + 1];
  out[o + 2] = positions[a + 2];
  out[o + 3] = positions[b];
  out[o + 4] = positions[b + 1];
  out[o + 5] = positions[b + 2];
}

/** Edges whose dihedral angle exceeds the threshold. View-independent. */
export function creaseSegments(adj: EdgeAdjacency, thresholdDeg = 25): Float32Array {
  const { edges, faceNormals } = adj;
  const cosThreshold = Math.cos((thresholdDeg * Math.PI) / 180);
  const edgeCount = edges.length / 4;
  const isCrease = (e: number): boolean => {
    const l = edges[e * 4 + 2] * 3;
    const r = edges[e * 4 + 3] * 3;
    const dot =
      faceNormals[l] * faceNormals[r] +
      faceNormals[l + 1] * faceNormals[r + 1] +
      faceNormals[l + 2] * faceNormals[r + 2];
    return dot < cosThreshold;
  };

  let count = 0;
  for (let e = 0; e < edgeCount; e++) if (isCrease(e)) count++;
  const out = new Float32Array(count * 6);
  let o = 0;
  for (let e = 0; e < edgeCount; e++) {
    if (!isCrease(e)) continue;
    writeEdge(adj, e, out, o);
    o += 6;
  }
  return out;
}

/** Edges whose two faces disagree on facing the camera. */
export function silhouetteSegments(adj: EdgeAdjacency, camera: Vec3): Float32Array {
  const { edges, faceNormals, faceCentres } = adj;
  const [cx, cy, cz] = camera;
  const edgeCount = edges.length / 4;
  const isFront = (f: number): boolean =>
    faceNormals[f] * (cx - faceCentres[f]) +
      faceNormals[f + 1] * (cy - faceCentres[f + 1]) +
      faceNormals[f + 2] * (cz - faceCentres[f + 2]) >
    0;
  const isSilhouette = (e: number): boolean =>
    isFront(edges[e * 4 + 2] * 3) !== isFront(edges[e * 4 + 3] * 3);

  let count = 0;
  for (let e = 0; e < edgeCount; e++) if (isSilhouette(e)) count++;
  const out = new Float32Array(count * 6);
  let o = 0;
  for (let e = 0; e < edgeCount; e++) {
    if (!isSilhouette(e)) continue;
    writeEdge(adj, e, out, o);
    o += 6;
  }
  return out;
}
