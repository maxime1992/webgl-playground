import { Mesh, PrimitiveType } from './mesh';
import { vec2, vec3 } from 'gl-matrix';

export function makeSphere(verticalDivisions: number = 10, horizontalDivisions: number = 10): Mesh {
  const mesh = new Mesh();

  mesh.primitiveType = PrimitiveType.POINTS;

  /*
  x = sin(theta) * cos(phi)
  y = sin(theta) * sin(phi)
  z = cos(theta)
  */
  for (let hi = 0; hi < horizontalDivisions; ++hi) {
    const phi = (hi / horizontalDivisions) * Math.PI * 2.0;

    for (let vi = 0; vi <= verticalDivisions; ++vi) {
      const theta = (vi / verticalDivisions) * Math.PI;

      const p = vec3.fromValues(Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta));

      mesh.positions.push(p);
    }
  }

  return mesh;
}
