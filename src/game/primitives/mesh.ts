import { vec2, vec3 } from 'gl-matrix';

export enum PrimitiveType {
  POINTS = 'Points',
  LINES = 'Lines',
  LINE_STRIP = 'LineStrip',
  TRIANGLES = 'Triangles',
  TRIANGLE_STRIP = 'TriangleStrip',
  TRIANGLE_FAN = 'TriangleFan',
}

export function toGlType(gl: WebGLRenderingContext, primitiveType: PrimitiveType): GLenum {
  const PRIMITIVE_TYPE_TO_GL_TYPE: Record<PrimitiveType, GLenum> = {
    [PrimitiveType.POINTS]: gl.POINTS,
    [PrimitiveType.LINES]: gl.LINES,
    [PrimitiveType.LINE_STRIP]: gl.LINE_STRIP,
    [PrimitiveType.TRIANGLES]: gl.TRIANGLES,
    [PrimitiveType.TRIANGLE_STRIP]: gl.TRIANGLE_STRIP,
    [PrimitiveType.TRIANGLE_FAN]: gl.TRIANGLE_FAN,
  };

  return PRIMITIVE_TYPE_TO_GL_TYPE[primitiveType];
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

  public createNormalsMesh(): Mesh {
    const normalsMesh = new Mesh();
    this.positions.forEach((position, index) =>
      normalsMesh.positions.push(position, vec3.add(vec3.create(), position, this.normals[index])),
    );
    normalsMesh.primitiveType = PrimitiveType.LINES;
    return normalsMesh;
  }
}
