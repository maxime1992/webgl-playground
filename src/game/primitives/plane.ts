import { Mesh, PrimitiveType } from './mesh';
import { vec2, vec3 } from 'gl-matrix';

export function makePlane(rows: number = 1, columns: number = 1): Mesh {
  const mesh = new Mesh();

  mesh.primitiveType = PrimitiveType.TRIANGLES;

  //
  // Vertices
  //
  for (let yi = 0; yi <= rows; ++yi) {
    const y = yi / rows;

    for (let xi = 0; xi <= columns; ++xi) {
      const x = xi / columns;

      const p = vec3.fromValues(x, y, 0);
      vec3.add(p, p, vec3.fromValues(-0.5, -0.5, 0.0));

      mesh.positions.push(p);
      mesh.textureCoordinates.push(vec2.fromValues(x, 1.0 - y));
    }
  }

  mesh.normals = Array.from<vec3>({ length: mesh.positions.length }).fill(vec3.fromValues(0, 0, 1));

  //
  // Indices
  //
  for (let yi = 0; yi < rows; ++yi) {
    let offset = yi * (columns + 1);

    for (let xi = 0; xi < columns; ++xi) {
      // First triangle
      mesh.indices.push(offset + 0); // bottom left
      mesh.indices.push(offset + 1); // bottom right
      mesh.indices.push(offset + (columns + 1) + 0); // top left

      // Second triangle
      mesh.indices.push(offset + (columns + 1) + 1); // top right
      mesh.indices.push(offset + (columns + 1) + 0); // top left
      mesh.indices.push(offset + 1); // bottom right

      offset += 1;
    }
  }

  return mesh;
}
