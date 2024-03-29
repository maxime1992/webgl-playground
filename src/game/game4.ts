// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { glMatrix, mat4, mat3, vec2, vec3 } from 'gl-matrix';
import { fromEvent, merge, Observable, pipe, combineLatest as combineLatestTopLevel, from, interval, of } from 'rxjs';
import {
  map,
  mapTo,
  mergeMap,
  startWith,
  takeUntil,
  tap,
  pairwise,
  scan,
  combineLatest,
  timestamp,
  switchMap,
} from 'rxjs/operators';
// import forestPicture from '../assets/forest-low-quality.jpg';
import minecraftSprite from '../assets/minecraft.png';
import { Program } from './graphics/program';
import { Shader } from './graphics/shader';
import { Pipeline, GeometryBuffer } from './graphics/pipeline';
import { Texture } from './graphics/texture';
import frag from './shaders/raytrace.frag';
import vert from './shaders/screenspace.vert';
import { Buffer } from './graphics/buffer';
import { VertexArray } from './graphics/vertex-array';

interface UserDragInput {
  yawAngle: number;
  pitchAngle: number;
}

const COLORING_POSITIONS = 0;
const COLORING_NORMALS = 1;
const COLORING_TEXTURE_COORDINATES = 2;
const COLORING_VERTEX_COLORS = 3;
const COLORING_UNIFORM_COLOR = 4;
const COLORING_TEXTURE = 5;
const COLORING_WHITE = 6;

const SHADING_NONE = 0;
const SHADING_LAMBERTIAN = 1;

let coloring = COLORING_UNIFORM_COLOR;
let shading = SHADING_LAMBERTIAN;

export const startGame4 = () => {
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

  const vboData = new Float32Array([0, 1, 2, 3]);

  const vertexBuffer = new Buffer(gl, vboData);

  const vertexArray = new VertexArray(gl, program, vertexBuffer, [
    {
      name: 'vertex_index',
      size: 1,
      type: gl.FLOAT,
      offset: 0,
    },
  ]);

  const geometryBuffer: GeometryBuffer = {
    vertexBuffer,
    vertexArray,
    indexBuffer: null,
    vertexCount: vboData.length,
    primitiveType: gl.TRIANGLE_STRIP,
  };

  let pipeline = new Pipeline(program, null, null, [geometryBuffer]);

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
      tap(([_1, userInput, { orbitDistance }]) => {
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

  // Field of View Y (angle between top and bottom planes of camera)
  const fovY = glMatrix.toRadian(60.0);
  // Aspect ratio
  const aspect = canvas.width / canvas.height;

  // cw / ch = hw / hh
  // (cw / ch) * hh = hw
  // aspect * hh = hw;

  // soh cah toa
  // sine    = opposite / hypotenuse
  // cosine  = adjacent / hypotenuse
  // tangent = opposite / adjacent

  const halfHeight = Math.tan(fovY * 0.5) * orbitDistance;
  const halfWidth = aspect * halfHeight;

  let right = vec3.fromValues(halfWidth, 0, 0) as [number, number, number];
  let up = vec3.fromValues(0, halfHeight, 0) as [number, number, number];
  let look = vec3.fromValues(0, 0, -orbitDistance) as [number, number, number];

  let eyePosition = vec3.fromValues(0, 0, orbitDistance);
  if (userDragInput) {
    [eyePosition, right, up, look].forEach((direction) => {
      vec3.rotateX(direction, direction, [0, 0, 0], userDragInput.pitchAngle);
      vec3.rotateY(direction, direction, [0, 0, 0], userDragInput.yawAngle);
    });
  }

  const cameraBasis = mat3.fromValues(...right, ...up, ...look);

  // const viewMatrix = mat4.lookAt(
  //   mat4.create(),
  //   eyePosition, // Eye position
  //   [0, 0, 0], // Point to look at
  //   [0, 1, 0], // Up direction
  // );
  // mat4.multiply(transformationMatrix, viewMatrix, transformationMatrix);

  // const projectionMatrix = mat4.perspective(
  //   mat4.create(),
  //   // Field of View Y (angle between top and bottom planes of camera)
  //   glMatrix.toRadian(60.0),
  //   // Aspect ratio
  //   canvas.width / canvas.height,
  //   0.1, // Near clipping distance
  //   100.0, // Far clipping distance
  // );
  // mat4.multiply(transformationMatrix, projectionMatrix, transformationMatrix);

  // set the viewport and clear the framebuffer
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderPipeline(gl, pipeline, eyePosition, cameraBasis, vec2.fromValues(canvas.clientWidth, canvas.clientHeight));
}

function renderPipeline(
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  eyePosition: vec3,
  cameraBasis: mat3,
  viewportSize: vec2,
) {
  // const worldFromLocal = mat4.create();
  // const worldFromLocalNormal = mat3.normalFromMat4(mat3.create(), worldFromLocal);

  const uniformColor = vec3.fromValues(1.0, 0.85, 0.7);
  // const opacity = 1.0;

  pipeline.program.use(() => {
    pipeline.program.setFloatUniform(viewportSize, `viewportSize`);
    pipeline.program.setMatrixUniform(cameraBasis, `cameraBasis`);
    pipeline.program.setFloatUniform(eyePosition, `eyePosition`);
    // pipeline.program.setMatrixUniform(worldFromLocalNormal, `worldFromLocalNormal`);
    // pipeline.program.setMatrixUniform(projectionFromWorld, `projectionFromWorld`);

    pipeline.program.setIntUniform(shading, `shading`);
    pipeline.program.setIntUniform(coloring, `coloring`);
    pipeline.program.setFloatUniform(uniformColor, `uniformColor`);
    // pipeline.program.setFloatUniform(opacity, `opacity`);

    if (pipeline.texture) {
      // pipeline.program.setTextureUniform(pipeline.texture, `tex`);
    }

    pipeline.geometry.forEach((geometry) => {
      geometry.vertexArray.render(geometry.primitiveType, 0, geometry.vertexCount, geometry.indexBuffer);
    });
  });
}
