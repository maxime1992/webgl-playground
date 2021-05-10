import { vec2, vec3 } from 'gl-matrix';

export enum PrimitiveType {
  POINTS = 'Points',
  LINES = 'Lines',
  LINE_STRIP = 'LineStrip',
  TRIANGLES = 'Triangles',
  TRIANGLE_STRIP = 'TriangleStrip',
  TRIANGLE_FAN = 'TriangleFan',
}

export class Mesh {
  // Vertex data:
  public positions: vec3[] = [];
  public normals: vec3[] = [];
  public textureCoordinates: vec2[] = [];
  public vertexColors: vec3[] = [];

  // Vertex order data:
  public indices: number[] = [];

  // Rasterisation <word>
  public primitiveType: PrimitiveType = PrimitiveType.POINTS;
}
