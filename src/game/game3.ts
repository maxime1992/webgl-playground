// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { glMatrix, mat2, mat4, vec2, vec3 } from 'gl-matrix';
import { fromEvent, merge, Observable } from 'rxjs';
import { map, mapTo, mergeMap, startWith, takeUntil, tap } from 'rxjs/operators';
import forestPicture from '../assets/forest-low-quality.jpg';
import filterFrag from './edge-filter.frag';
import { Program } from './program';
import { Shader } from './shader';
import { VertexArray } from './vertex-array';
import { Texture } from './texture';
import { Buffer } from './buffer';
import { Framebuffer } from './framebuffer';
import frag from './shader3.frag';
import vert from './shader.vert';
import lineVert from './line.vert';
import { NUM_BYTES_IN_FLOAT, VECTOR_2_SIZE, VECTOR_3_SIZE } from './utils';

function is_zero(x: number): boolean {
  const EQN_EPS = 1e-16;
  return x > -EQN_EPS && x < EQN_EPS;
}

/// \brief Solves an equation of the form ax^2 + bx + c = 0
function solve_quadratic(a: number, b: number, c: number): number[] {
  let p: number;
  let q: number;
  let D: number;

  /* normal form: x^2 + px + q = 0 */

  p = b / (2 * a);
  q = c / a;

  D = p * p - q;

  if (is_zero(D)) {
    return [-p];
  } else if (D < 0) {
    return [];
  } else {
    /* if (D > 0) */
    const sqrt_D = Math.sqrt(D);
    return [sqrt_D - p, -sqrt_D - p];
  }
}

interface UserInput {
  initialMouseClipSpace: vec2;
  currentMouseClipSpace: vec2;
  interactions: {
    rotate: boolean;
    scale: boolean;
    translate: boolean;
  };
}

// often called "pipeline" or "render pass"
interface Pipeline {
  program: Program;
  buffer: Buffer;
  vertexArray: VertexArray;
  texture: Texture | null;
  framebuffer: Framebuffer | null;
  vertexCount: number;
}

// will do later on
// function renderPassToFrameBuffer(pipeline: Pipeline):void {
// }

const circleRadius = 2;

export const startGame3 = () => {
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

  // circle
  const vertex = new Shader(gl, { type: gl.VERTEX_SHADER, source: vert });
  const fragment = new Shader(gl, { type: gl.FRAGMENT_SHADER, source: frag });

  const program = new Program(gl, vertex, fragment);

  /*
   * Create vertex buffer
   */

  const precision = 100;
  let angle = (2 * Math.PI) / 100;
  let topPositionsData: number[] = [];

  for (let i = 0; i <= precision; i += 1) {
    const a = angle * i;

    topPositionsData.push(Math.cos(a) * circleRadius);
    topPositionsData.push(Math.sin(a) * circleRadius);
    topPositionsData.push(0);
  }

  const positions = new Float32Array([...topPositionsData]);

  const vboData = new Float32Array([...positions]);

  const vertexBuffer = new Buffer(gl, vboData);

  const vertexCount = positions.length / VECTOR_3_SIZE;

  const vertexArray = new VertexArray(gl, program, vertexBuffer, [
    {
      name: 'position',
      size: VECTOR_3_SIZE,
      type: gl.FLOAT,
      offset: 0,
    },
  ]);

  const pipeline: Pipeline = {
    program,
    buffer: vertexBuffer,
    texture: null,
    framebuffer: null,
    vertexArray,
    vertexCount,
  };

  // line
  const lineVertex = new Shader(gl, { type: gl.VERTEX_SHADER, source: lineVert });

  const lineProgram = new Program(gl, lineVertex, fragment);

  /*
   * Create vertex buffer
   */

  const lineVboData = new Float32Array([0, 1]);

  const lineVertexBuffer = new Buffer(gl, lineVboData);

  const lineVertexCount = positions.length;

  const lineVertexArray = new VertexArray(gl, lineProgram, lineVertexBuffer, [
    {
      name: 'index',
      size: 1,
      type: gl.FLOAT,
      offset: 0,
    },
  ]);

  const linePipeline: Pipeline = {
    program: lineProgram,
    buffer: lineVertexBuffer,
    texture: null,
    framebuffer: null,
    vertexArray: lineVertexArray,
    vertexCount: lineVertexCount,
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

  const userInput$ = down$.pipe(
    mergeMap((downMouseEvent) =>
      move$.pipe(
        map((moveMouseEvent) => getUserInput(downMouseEvent, moveMouseEvent, canvas)),
        takeUntil(up$),
      ),
    ),
  );

  function getUserInput(
    initialMouseEvent: MouseEvent,
    currentMouseEvent: MouseEvent,
    canvas: HTMLCanvasElement,
  ): UserInput {
    return {
      initialMouseClipSpace: mousePositionViewportSpaceToClipSpace(
        [initialMouseEvent.clientX, initialMouseEvent.clientY],
        canvas,
      ),
      currentMouseClipSpace: mousePositionViewportSpaceToClipSpace(
        [currentMouseEvent.clientX, currentMouseEvent.clientY],
        canvas,
      ),
      interactions: {
        rotate: initialMouseEvent.shiftKey,
        scale: initialMouseEvent.ctrlKey,
        translate: initialMouseEvent.altKey,
      },
    };
  }

  function mousePositionViewportSpaceToClipSpace(
    // in viewport space the origin 0, 0 is at the top left
    // the bottom right corner has the coordinates canvasClientWidth, canvasClientHeight
    mousePositionViewportSpace: vec2,
    canvas: HTMLCanvasElement,
  ): vec2 {
    // the WebGL viewport space has the origin at the bottom left
    // therefore we do not modify the x value but need to update y
    // to reflect this
    const mousePositionWebGlViewportSpace: vec2 = [
      mousePositionViewportSpace[0],
      canvas.clientHeight - mousePositionViewportSpace[1] - 1,
    ];

    // new range is 0,0 (bottom left) 1,1 (top right)
    const normalizedMousePositionViewportSpace = vec2.divide(
      vec2.create(),
      mousePositionWebGlViewportSpace,
      vec2.fromValues(canvas.clientWidth, canvas.clientHeight),
    );

    // we now need to transform that into clip space which goes
    // from -1,-1 (bottom left) to 1,1 (top right)
    const mousePositionClipSpace = vec2.scaleAndAdd(
      vec2.create(),
      vec2.fromValues(-1, -1),
      normalizedMousePositionViewportSpace,
      2,
    );

    return mousePositionClipSpace;
  }

  userInput$
    .pipe(
      startWith(undefined),
      tap((userInput) => {
        render(canvas, gl, pipeline, linePipeline, userInput);
      }),
    )
    .subscribe();
};

function render(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  linePipeline: Pipeline,
  userInput?: UserInput,
) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  // set the viewport and clear the framebuffer
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let transformationMatrix = mat4.create();

  const viewMatrix = mat4.lookAt(mat4.create(), [0, 0, 3], [0, 0, 0], [0, 1, 0]);
  mat4.multiply(transformationMatrix, viewMatrix, transformationMatrix);

  const aspectRatio = canvas.width / canvas.height;

  const height = 6.0;
  const width = aspectRatio * height;

  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;

  const projectionMatrix = mat4.ortho(mat4.create(), -halfWidth, +halfWidth, -halfHeight, +halfHeight, 0.1, 100.0);
  mat4.multiply(transformationMatrix, projectionMatrix, transformationMatrix);

  renderPipeline(gl, pipeline, transformationMatrix, vec3.fromValues(0, 0, 1), gl.LINE_STRIP);

  if (userInput) {
    const initialWorldPos = vec2.mul(
      vec2.create(),
      userInput.initialMouseClipSpace,
      vec2.fromValues(halfWidth, halfHeight),
    );
    const currentWorldPos = vec2.mul(
      vec2.create(),
      userInput.currentMouseClipSpace,
      vec2.fromValues(halfWidth, halfHeight),
    );

    // Draw line
    renderPipeline(
      gl,
      linePipeline,
      transformationMatrix,
      vec3.fromValues(0, 1, 0),
      gl.LINE_STRIP,
      mat2.fromValues(initialWorldPos[0], initialWorldPos[1], currentWorldPos[0], currentWorldPos[1]),
    );

    // Compute intersection between the line and the circle
    interface Ray {
      origin: vec2;
      direction: vec2;
    }

    const ray: Ray = {
      origin: initialWorldPos,
      direction: vec2.normalize(vec2.create(), vec2.subtract(vec2.create(), currentWorldPos, initialWorldPos)),
    };

    const computeIntersections = (): vec2[] => {
      const a = vec2.dot(ray.direction, ray.direction);
      const b = 2 * vec2.dot(ray.origin, ray.direction);
      const c = vec2.dot(ray.origin, ray.origin) - circleRadius * circleRadius;
      const ts: number[] = solve_quadratic(a, b, c);

      return ts.map((t: number) => {
        return vec2.scaleAndAdd(vec2.create(), ray.origin, ray.direction, t);
      });
    };

    const intersectionPoints: vec2[] = computeIntersections();

    if (intersectionPoints.length) {
      // Display the intersection point
      const points = mat2.fromValues(
        intersectionPoints[0][0],
        intersectionPoints[0][1],
        intersectionPoints[1]?.[0] ?? intersectionPoints[0][0],
        intersectionPoints[1]?.[1] ?? intersectionPoints[0][0],
      );

      renderPipeline(gl, linePipeline, transformationMatrix, vec3.fromValues(1, 0, 1), gl.POINTS, points);
    }
  }
}

function renderPipeline(
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  transformationMatrix: mat4,
  color: vec3,
  primitiveType: GLenum,
  positions: mat2 | null = null,
) {
  pipeline.program.use(() => {
    pipeline.program.setMatrixUniform(transformationMatrix, `transformation`);

    if (positions) {
      pipeline.program.setMatrixUniform(positions, `positions`);
    }

    pipeline.program.setFloatUniform(color, `color`);

    pipeline.vertexArray.render(primitiveType, 0, pipeline.vertexCount);
  });
}
