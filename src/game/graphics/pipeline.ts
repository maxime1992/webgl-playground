import { Program } from './program';
import { Texture } from './texture';
import { Buffer } from './buffer';
import { VertexArray } from './vertex-array';
import { Framebuffer } from './framebuffer';
import { Mesh, toGlType } from '../primitives/mesh';
import { NUM_BYTES_IN_FLOAT, VECTOR_2_SIZE, VECTOR_3_SIZE } from './utils';
import { vec2, vec3 } from 'gl-matrix';

export interface GeometryBuffer {
  vertexBuffer: Buffer;
  vertexArray: VertexArray;
  indexBuffer: Buffer | null;
  vertexCount: number;
  primitiveType: GLenum;
}

// function isVec3Tuple(vecs: vec3[]): vecs is number[][]{
//   return true
// }

export class Pipeline {
  constructor(
    public program: Program,
    public texture: Texture | null,
    public framebuffer: Framebuffer | null,
    public geometry: GeometryBuffer[],
  ) {}

  private meshToGeometryBuffer(gl: WebGLRenderingContext, mesh: Mesh): GeometryBuffer {
    function Vec3toArray(v: vec3): number[] {
      return [v[0], v[1], v[2]];
    }

    function Vec2toArray(v: vec2): number[] {
      return [v[0], v[1]];
    }

    const flattenedFloats = [
      mesh.positions.map(Vec3toArray),
      mesh.normals.map(Vec3toArray),
      mesh.textureCoordinates.map(Vec2toArray),
      mesh.vertexColors.map(Vec3toArray),
    ].flat(2);

    const vboData = new Float32Array(flattenedFloats);
    const vertexBuffer = new Buffer(gl, vboData);

    const indexBuffer =
      mesh.indices.length === 0 ? null : new Buffer(gl, new Uint16Array(mesh.indices), gl.ELEMENT_ARRAY_BUFFER);
    const vertexCount = mesh.indices.length === 0 ? mesh.positions.length : mesh.indices.length;

    const vertexArray = new VertexArray(gl, this.program, vertexBuffer, [
      {
        name: 'localPosition',
        size: VECTOR_3_SIZE,
        type: gl.FLOAT,
        offset: 0,
      },
      {
        name: 'localNormal',
        size: VECTOR_3_SIZE,
        type: gl.FLOAT,
        offset: mesh.positions.length * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT,
      },
      {
        name: 'textureCoordinates',
        size: VECTOR_2_SIZE,
        type: gl.FLOAT,
        offset:
          mesh.positions.length * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT +
          mesh.normals.length * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT,
      },
      {
        name: 'color',
        size: VECTOR_3_SIZE,
        type: gl.FLOAT,
        offset:
          mesh.positions.length * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT +
          mesh.normals.length * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT +
          mesh.textureCoordinates.length * VECTOR_2_SIZE * NUM_BYTES_IN_FLOAT,
      },
    ]);

    return {
      vertexBuffer,
      vertexArray,
      indexBuffer,
      vertexCount,
      primitiveType: toGlType(gl, mesh.primitiveType),
    };
  }

  public addGeometry(gl: WebGLRenderingContext, mesh: Mesh): void {
    this.geometry.push(this.meshToGeometryBuffer(gl, mesh));
  }

  public clearGeometry(): void {
    this.geometry = [];
  }
}
