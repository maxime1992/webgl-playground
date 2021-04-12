// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { glMatrix, mat4, mat3, vec2, vec3 } from 'gl-matrix';
import { fromEvent, merge, Observable, pipe, combineLatest as combineLatestTopLevel } from 'rxjs';
import { map, mapTo, mergeMap, startWith, takeUntil, tap, pairwise, scan, combineLatest } from 'rxjs/operators';
import forestPicture from '../assets/forest-low-quality.jpg';
import filterFrag from './edge-filter.frag';
import { Program } from './program';
import { Shader } from './shader';
import { VertexArray } from './vertex-array';
import { Texture } from './texture';
import { Buffer } from './buffer';
import { Framebuffer } from './framebuffer';
import frag from './debug.frag';
import vert from './debug.vert';
import { NUM_BYTES_IN_FLOAT, VECTOR_2_SIZE, VECTOR_3_SIZE } from './utils';

interface UserDragInput {
  yawAngle: number;
  pitchAngle: number;
}

// often called "pipeline" or "render pass"
interface Pipeline {
  program: Program;
  vertexBuffer: Buffer;
  vertexArray: VertexArray;
  indexBuffer: Buffer | null;
  texture: Texture | null;
  framebuffer: Framebuffer | null;
  vertexCount: number;
  primitiveType: GLenum;
}

const COLORING_POSITIONS = 0;
const COLORING_NORMALS = 1;
const COLORING_TEXTURE_COORDINATES = 2;
const COLORING_VERTEX_COLORS = 3;
const COLORING_UNIFORM_COLOR = 4;
const COLORING_TEXTURE = 5;
const COLORING_WHITE = 6;

export const startGame2 = () => {
  /*
   * Setup WebGL
   */
  const canvas: HTMLCanvasElement | undefined = document.getElementById('renderCanvas') as HTMLCanvasElement;

  if (!canvas) {
    throw new Error(`No canvas available`);
  }
  const options: WebGLContextAttributes = {
    antialias: true,
  };
  const gl = canvas.getContext('webgl', options);

  if (!gl) {
    throw new Error(`OpenGL not available!`);
  }

  // set default value
  gl.clearColor(0, 0, 0, 1);

  // Render closer items on top of farther items
  gl.enable(gl.DEPTH_TEST);

  // "Cull" (don't render) the back faces of triangles
  gl.enable(gl.CULL_FACE);

  const vertex = new Shader(gl, { type: gl.VERTEX_SHADER, source: vert });
  const fragment = new Shader(gl, { type: gl.FRAGMENT_SHADER, source: frag });

  const program = new Program(gl, vertex, fragment);

  /*
   * Create vertex buffer
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

  const A = [-0.5, -0.5, +0.5];
  const B = [-0.5, -0.5, -0.5];
  const C = [+0.5, -0.5, -0.5];
  const D = [+0.5, -0.5, +0.5];
  const E = [+0.5, +0.5, +0.5];
  const F = [-0.5, +0.5, +0.5];
  const G = [-0.5, +0.5, -0.5];
  const H = [+0.5, +0.5, -0.5];

  // TODO: Convert to Mesh class and use an index array.
  const positions = new Float32Array(
    [
      [A, D, F, E],
      [C, B, H, G],

      [D, C, E, H],
      [B, A, G, F],

      [A, B, D, C],
      [E, H, F, G],
    ].flat(2),
  );

  const NORMAL_X_AXIS_NEGATIVE = [-1, 0, 0] as const;
  const NORMAL_X_AXIS_POSITIVE = [1, 0, 0] as const;

  const NORMAL_Y_AXIS_NEGATIVE = [0, -1, 0] as const;
  const NORMAL_Y_AXIS_POSITIVE = [0, 1, 0] as const;

  const NORMAL_Z_AXIS_NEGATIVE = [0, 0, -1] as const;
  const NORMAL_Z_AXIS_POSITIVE = [0, 0, 1] as const;

  const generateSameFourNormals = (normal: readonly [x: number, y: number, z: number]) => [
    normal,
    normal,
    normal,
    normal,
  ];

  const normals = new Float32Array(
    [
      generateSameFourNormals(NORMAL_Z_AXIS_POSITIVE),
      generateSameFourNormals(NORMAL_Z_AXIS_NEGATIVE),
      generateSameFourNormals(NORMAL_X_AXIS_POSITIVE),
      generateSameFourNormals(NORMAL_X_AXIS_NEGATIVE),
      generateSameFourNormals(NORMAL_Y_AXIS_POSITIVE),
      generateSameFourNormals(NORMAL_Y_AXIS_NEGATIVE),
    ].flat(2),
  );

  const vboData = new Float32Array([...positions, ...normals]);
  const vertexBuffer = new Buffer(gl, vboData);

  const iboBuffer = new Uint16Array(
    Array.from({ length: positions.length / 4 })
      .fill(null)
      .map((_, i) => {
        const offset = i * 4; // 4 vertices per face
        return [offset + 0, offset + 1, offset + 2, offset + 2, offset + 1, offset + 3];
      })
      .flat(2),
  );
  const indexBuffer = new Buffer(gl, iboBuffer, gl.ELEMENT_ARRAY_BUFFER);

  const vertexCount = iboBuffer.length;

  /*
   * Textures
   */

  const vertexArray = new VertexArray(gl, program, vertexBuffer, [
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
      offset: positions.length * NUM_BYTES_IN_FLOAT,
    },
  ]);

  const pipeline: Pipeline = {
    program,
    vertexBuffer,
    vertexArray,
    indexBuffer,
    texture: null,
    framebuffer: null,
    vertexCount,
    primitiveType: gl.TRIANGLES,
  };

  /*
   * "Render loop"
   */

  // drag: translation --> current position of the mouse
  // ctrl + drag: rotation --> starting point + the current one
  // shift + drag: scale

  const move$ = fromEvent<MouseEvent>(document, 'mousemove');
  const down$ = fromEvent<MouseEvent>(document, 'mousedown');
  const up$ = fromEvent<MouseEvent>(document, 'mouseup');
  const zoom$ = fromEvent<WheelEvent>(document, 'wheel');
  const windowResize$ = fromEvent(window, 'resize');

  const userInput$ = down$.pipe(
    mergeMap((downMouseEvent) =>
      move$.pipe(
        pairwise(),
        map(([previousMoveMouseEvent, currentMoveMouseEvent]) =>
          getUserInput(previousMoveMouseEvent, currentMoveMouseEvent),
        ),
        takeUntil(up$),
      ),
    ),
  );

  function getUserInput(previousMouseEvent: MouseEvent, currentMouseEvent: MouseEvent): UserDragInput {
    return {
      yawAngle: glMatrix.toRadian((currentMouseEvent.clientX - previousMouseEvent.clientX) * -0.5),
      pitchAngle: glMatrix.toRadian((currentMouseEvent.clientY - previousMouseEvent.clientY) * -0.5),
    };
  }

  const DEFAULT_USER_INPUT: UserDragInput = {
    yawAngle: 0,
    pitchAngle: 0,
  };

  combineLatestTopLevel(
    windowResize$.pipe(startWith(undefined)),
    userInput$.pipe(
      scan<UserDragInput>(
        (acc, curr) => ({
          yawAngle: acc.yawAngle + curr.yawAngle,
          pitchAngle: Math.max(
            Math.min(acc.pitchAngle + curr.pitchAngle, glMatrix.toRadian(89.9)),
            glMatrix.toRadian(-89.9),
          ),
        }),
        DEFAULT_USER_INPUT,
      ),
      startWith(DEFAULT_USER_INPUT),
    ),
    zoom$.pipe(
      scan<WheelEvent, { orbitDistance: number }>(
        (acc, curr) => ({
          orbitDistance: acc.orbitDistance + Math.sign(curr.deltaY) * acc.orbitDistance * 0.075,
        }),
        { orbitDistance: 5 },
      ),
      startWith({ orbitDistance: 5 }),
    ),
  )
    .pipe(
      tap(([_, userInput, { orbitDistance }]) => {
        render(canvas, gl, pipeline, userInput, orbitDistance);
      }),
    )
    .subscribe();
};

function render(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  userDragInput: UserDragInput,
  orbitDistance: number,
) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  let transformationMatrix = mat4.create();

  let eyePosition = vec3.fromValues(0, 0, orbitDistance);

  if (userDragInput) {
    vec3.rotateX(eyePosition, eyePosition, [0, 0, 0], userDragInput.pitchAngle);
    vec3.rotateY(eyePosition, eyePosition, [0, 0, 0], userDragInput.yawAngle);
  }

  const viewMatrix = mat4.lookAt(
    mat4.create(),
    eyePosition, // Eye position
    [0, 0, 0], // Point to look at
    [0, 1, 0], // Up direction
  );
  mat4.multiply(transformationMatrix, viewMatrix, transformationMatrix);

  const projectionMatrix = mat4.perspective(
    mat4.create(),
    // Field of View Y (angle between top and bottom planes of camera)
    glMatrix.toRadian(60.0),
    // Aspect ratio
    canvas.width / canvas.height,
    0.1, // Near clipping distance
    100.0, // Far clipping distance
  );
  mat4.multiply(transformationMatrix, projectionMatrix, transformationMatrix);

  // set the viewport and clear the framebuffer
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderPipeline(gl, pipeline, transformationMatrix);
}

function renderPipeline(
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  projectionFromWorld: mat4,
  screenSize: vec2 | null = null,
) {
  const worldFromLocal = mat4.create();
  const worldFromLocalNormal = mat3.normalFromMat4(mat3.create(), worldFromLocal);

  const coloring = COLORING_NORMALS;
  const uniformColor = vec3.fromValues(1.0, 0.85, 0.7);
  const opacity = 1.0;

  pipeline.program.use(() => {
    pipeline.program.setMatrixUniform(worldFromLocal, `worldFromLocal`);
    pipeline.program.setMatrixUniform(worldFromLocalNormal, `worldFromLocalNormal`);
    pipeline.program.setMatrixUniform(projectionFromWorld, `projectionFromWorld`);

    pipeline.program.setIntUniform(coloring, `coloring`);
    pipeline.program.setFloatUniform(uniformColor, `uniformColor`);
    pipeline.program.setFloatUniform(opacity, `opacity`);

    if (pipeline.texture) {
      pipeline.program.setTextureUniform(pipeline.texture, `tex`);
    }

    pipeline.vertexArray.render(pipeline.primitiveType, 0, pipeline.vertexCount, pipeline.indexBuffer);
  });
}
