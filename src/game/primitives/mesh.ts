import { vec2, vec3 } from 'gl-matrix';

export class Mesh {
  // Vertex data:
  private positions: vec3[];
  private normals: vec3[];
  private textureCoordinates: vec2[];
  private vertexColors: vec3[];

  // Vertex order data:
  private indices: Uint32Array;

  // Rasterisation <word>
  private primitiveType: GLenum;
}
