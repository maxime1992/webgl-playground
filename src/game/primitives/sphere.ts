import { Mesh, PrimitiveType } from './mesh';
import { vec2, vec3 } from 'gl-matrix';

export function makeSphere(verticalDivisions: number = 3, horizontalDivisions: number = 3): Mesh {
  const mesh = new Mesh();

  mesh.primitiveType = PrimitiveType.TRIANGLES;

  //
  // Equation for a point on a sphere:
  //   x = sin(theta) * cos(phi)
  //   y = sin(theta) * sin(phi)
  //   z = cos(theta)
  //

  //
  // Vertices
  //
  for (let hi = 0; hi <= horizontalDivisions; ++hi) {
    const u = hi / horizontalDivisions;
    const phi = u * Math.PI * 2.0;

    for (let vi = 0; vi <= verticalDivisions; ++vi) {
      const v = vi / verticalDivisions;
      const theta = v * Math.PI;

      const p = vec3.fromValues(Math.sin(theta) * Math.cos(phi), Math.cos(theta), Math.sin(theta) * Math.sin(phi));

      mesh.positions.push(p);
      mesh.normals.push(p);
      mesh.textureCoordinates.push(vec2.fromValues(u, v));
    }
  }

  //
  // Indices
  //
  for (let yi = 0; yi < horizontalDivisions; ++yi) {
    let offset = yi * (horizontalDivisions + 1);

    for (let xi = 0; xi < verticalDivisions; ++xi) {
      // First triangle
      mesh.indices.push(offset + 1); // bottom left
      mesh.indices.push(offset + 0); // bottom right
      mesh.indices.push(offset + (horizontalDivisions + 1) + 1); // top left

      // Second triangle
      mesh.indices.push(offset + (horizontalDivisions + 1) + 0); // top right
      mesh.indices.push(offset + (horizontalDivisions + 1) + 1); // top left
      mesh.indices.push(offset + 0); // bottom right

      offset += 1;
    }
  }

  return mesh;
}
