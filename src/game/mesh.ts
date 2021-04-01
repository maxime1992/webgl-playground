import { vec2, vec3 } from "gl-matrix"

export class Mesh {
  // Vertex data:
    private positions: vec3[]
  private normals: vec3[]
  private textureCoordinates: vec2[]
  private vertexColors: vec3[]

  // Vertex order data:
  private indices: Uint32Array

    // Rasterisation <word>
  private primitiveType: GLenum
}



// vertices = [
//     d0, d1, d2, d3,
// ];

// Mesh.indices = [
//     0, 1, 2, // Triangle 1
//     2, 3, 0  // Triangle 2
//     2, 1, 0  // Triangle 2
//     0, 3, 1  // Triangle 2
// ]