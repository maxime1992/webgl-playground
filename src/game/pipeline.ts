import { Program } from './program';
import { Texture } from './texture';
import { Buffer } from './buffer';
import { VertexArray } from './vertex-array';
import { Framebuffer } from './framebuffer';
import { Mesh } from './primitives/mesh';
import { NUM_BYTES_IN_FLOAT, VECTOR_2_SIZE, VECTOR_3_SIZE } from './utils';
import { vec2, vec3 } from 'gl-matrix';

interface GeometryBuffer {
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
    function toArray(v: vec3): number[] {
      return [v[0], v[1], v[2]];
    }

    // function toArray(v: vec2): number[] {
    //   return [v[0], v[1]]
    // }

    const tmp = [mesh.positions.map(toArray), mesh.normals.map(toArray)].flat(2);

    const vboData = new Float32Array(tmp);
    const vertexBuffer = new Buffer(gl, vboData);

    const indexBuffer = new Buffer(gl, mesh.indices, gl.ELEMENT_ARRAY_BUFFER);
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
    ]);

    return {
      vertexBuffer,
      vertexArray,
      indexBuffer,
      vertexCount,
      primitiveType: gl.TRIANGLES, // TODO: convert from mesh.primitiveType
    };
  }

  public addGeometry(gl: WebGLRenderingContext, mesh: Mesh): void {
    this.geometry.push(this.meshToGeometryBuffer(gl, mesh));
  }
}
