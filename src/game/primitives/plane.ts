import { Mesh, PrimitiveType } from './mesh';
import { vec2, vec3 } from 'gl-matrix';

export function makePlane(xSubdivisions: number, ySubdivisions: number): Mesh {
  const mesh = new Mesh();

  mesh.primitiveType = PrimitiveType.TRIANGLE_STRIP;

  // created positions, normals, whatev

  mesh.indices = [1, 2, 0, 3, 0xffff, 1, 8, 4]; // draw order

  return mesh;
}
