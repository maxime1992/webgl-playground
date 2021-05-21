import { Mesh, PrimitiveType } from './mesh';
import { vec2, vec3 } from 'gl-matrix';

export function makeCube(): Mesh {
  const mesh = new Mesh();

  mesh.primitiveType = PrimitiveType.TRIANGLES;

  /*
   * Create positions and normals
   */

  //          G                      H
  //           xxxxxxxxxxxxxxxxxxxxx
  //         xx                     xxx
  //       xx      x              xxx x
  //     xx        x            xxx   x
  //    xxx        x          xxx     x
  //   xxx         x        xxx       x
  //   xxxxxxxxxxxxxxxxxxxxxx         x
  // F x           x       xE         x
  //   x           x       x          x
  //   x        B  x       x         xx  C
  //   x           xxxxxxxxxxxxxxxxxxxx
  //   x          xx       x        xx
  //   x        xxx        x      xx
  //   x      xxx          x    xxx
  //   x    xxx            x   xx
  //   x  xxx              x  xx
  //   xxxx                xxx
  //   xxxxxxxxxxxxxxxxxxxxxx
  // A                      D

  const A = vec3.fromValues(-0.5, -0.5, +0.5);
  const B = vec3.fromValues(-0.5, -0.5, -0.5);
  const C = vec3.fromValues(+0.5, -0.5, -0.5);
  const D = vec3.fromValues(+0.5, -0.5, +0.5);
  const E = vec3.fromValues(+0.5, +0.5, +0.5);
  const F = vec3.fromValues(-0.5, +0.5, +0.5);
  const G = vec3.fromValues(-0.5, +0.5, -0.5);
  const H = vec3.fromValues(+0.5, +0.5, -0.5);

  mesh.positions = [
    [A, D, F, E],
    [C, B, H, G],

    [D, C, E, H],
    [B, A, G, F],

    [B, C, A, D],
    [F, E, G, H],
  ].flat();

  const NORMAL_X_AXIS_NEGATIVE = vec3.fromValues(-1, 0, 0);
  const NORMAL_X_AXIS_POSITIVE = vec3.fromValues(1, 0, 0);

  const NORMAL_Y_AXIS_NEGATIVE = vec3.fromValues(0, -1, 0);
  const NORMAL_Y_AXIS_POSITIVE = vec3.fromValues(0, 1, 0);

  const NORMAL_Z_AXIS_NEGATIVE = vec3.fromValues(0, 0, -1);
  const NORMAL_Z_AXIS_POSITIVE = vec3.fromValues(0, 0, 1);

  const generateSameFourNormals = (normal: vec3): vec3[] => [normal, normal, normal, normal];

  mesh.normals = [
    generateSameFourNormals(NORMAL_Z_AXIS_POSITIVE),
    generateSameFourNormals(NORMAL_Z_AXIS_NEGATIVE),
    generateSameFourNormals(NORMAL_X_AXIS_POSITIVE),
    generateSameFourNormals(NORMAL_X_AXIS_NEGATIVE),
    generateSameFourNormals(NORMAL_Y_AXIS_POSITIVE),
    generateSameFourNormals(NORMAL_Y_AXIS_NEGATIVE),
  ].flat();

  // TODO: add texture coordinates
  // texture space: 0 to 1
  mesh.textureCoordinates = Array.from({ length: 6 })
    .fill(null)
    .flatMap(() => [
      vec2.fromValues(0, 1),
      vec2.fromValues(1, 1),
      vec2.fromValues(0, 0),
      vec2.fromValues(1, 0),
      // add more
    ]);

  /*
   * Create indices
   */
  mesh.indices = Array.from({ length: mesh.positions.length / 4 })
    .fill(null)
    .flatMap((_, i) => {
      const offset = i * 4; // 4 vertices per face
      return [
        // triangle 1
        offset + 0,
        offset + 1,
        offset + 2,
        // triangle 2
        offset + 2,
        offset + 1,
        offset + 3,
      ];
    });

  return mesh;
}
