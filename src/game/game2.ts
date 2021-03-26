// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { glMatrix, mat4, vec2, vec3 } from 'gl-matrix';
import { fromEvent, merge, Observable, pipe, combineLatest} from 'rxjs';
import {
  map,
  mapTo,
  mergeMap,
  startWith,
  takeUntil,
  tap,
  pairwise,
  scan,combineLatest
} from 'rxjs/operators';
import forestPicture from '../assets/forest-low-quality.jpg';
import filterFrag from './edge-filter.frag';
import { Program } from './program';
import { Shader } from './shader';
import { VertexArray } from './vertex-array';
import { Texture } from './texture';
import { Buffer } from './buffer';
import { Framebuffer } from './framebuffer';
import frag from './shader2.frag';
import vert from './shader.vert';
import { NUM_BYTES_IN_FLOAT, VECTOR_2_SIZE, VECTOR_3_SIZE } from './utils';

interface UserDragInput {
  yawAngle: number,
  pitchAngle: number,
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

export const startGame2 = () => {
  /*
   * Setup WebGL
   */
  const canvas: HTMLCanvasElement | undefined = document.getElementById(
    'renderCanvas'
  ) as HTMLCanvasElement;

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

  const vertex = new Shader(gl, { type: gl.VERTEX_SHADER, source: vert });
  const fragment = new Shader(gl, { type: gl.FRAGMENT_SHADER, source: frag });

  const program = new Program(gl, vertex, fragment);

  /*
   * Create vertex buffer
   */

  // [-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0]
  // const positions = new Float32Array(
  //   Array.from({ length: 9 * 3 })
  //     .fill(null)
  //     .map(() => Math.random() * 2.0 - 1.0)
  // );
  const positions = new Float32Array([
    // bottom left
    -0.5,
    -0.5,
    0,
    // bottom right
    0.5,
    -0.5,
    0,
    // top left
    -0.5,
    0.5,
    0,
    // top right
    0.5,
    0.5,
    0,
  ]);

  const textureCoordinates = new Float32Array([
    // bottom left
    0,
    1,
    // bottom right (1,1)
    1,
    1,
    // top left (0,0)
    0,
    0,
    // top right
    1,
    0,
  ]);

  /*
  (0,0)-(1,0)
     \
      \
       \
        \
  (0,1)-(1,1)
  */

  const vboData = new Float32Array([...positions, ...textureCoordinates]);

  const vertexBuffer = new Buffer(gl, vboData);

  const vertexCount = positions.length / VECTOR_3_SIZE;

  /*
   * Textures
   */

 const vertexArray = new VertexArray(gl, program, vertexBuffer, [
    {
      name: 'position',
      size: VECTOR_3_SIZE,
      type: gl.FLOAT,
      offset: 0
    },
    {
      name: 'texC',
      size: VECTOR_2_SIZE,
      type: gl.FLOAT,
      offset: vertexCount * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT
    },
  ])

  const pipeline: Pipeline = {
    program,
    buffer: vertexBuffer,
    texture: null,
    framebuffer: null,
    vertexArray,
    vertexCount
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
  const zoom$ =   fromEvent<WheelEvent>(document, 'wheel')

  const userInput$ = down$.pipe(
    mergeMap((downMouseEvent) =>
      move$.pipe(
        pairwise(),
        map(([previousMoveMouseEvent, currentMoveMouseEvent]) =>
          getUserInput(previousMoveMouseEvent, currentMoveMouseEvent)
        ),
        takeUntil(up$)
      )
    )
  );

  function getUserInput(
    previousMouseEvent: MouseEvent,
    currentMouseEvent: MouseEvent,
  ): UserDragInput {
    return {
        yawAngle: glMatrix.toRadian((currentMouseEvent.clientX - previousMouseEvent.clientX) * -0.5),
        pitchAngle: glMatrix.toRadian((currentMouseEvent.clientY - previousMouseEvent.clientY) * -0.5),
    };
  }

  const windowResize$ = fromEvent(window, 'resize')
  
  const DEFAULT_USER_INPUT: UserDragInput = {
    yawAngle: 0,
    pitchAngle: 0,
  }


  const a$ = userInput$
  .pipe(
    scan<UserDragInput>((acc, curr) => ({
      yawAngle: acc.yawAngle + curr.yawAngle,
      pitchAngle: acc.pitchAngle + curr.pitchAngle
    }), DEFAULT_USER_INPUT),
    // combineLatest(windowResize$.pipe(startWith(undefined)))
    startWith(DEFAULT_USER_INPUT)
  );

  const b$ : Observable<{orbitDistance:number}> = zoom$
  .pipe(
    scan<WheelEvent, {orbitDistance: number}>((acc, curr) => ({
      orbitDistance: acc.orbitDistance + Math.sign(curr.deltaY) * acc.orbitDistance * 0.075
    }), {orbitDistance: 5}),
      startWith( {orbitDistance: 5})
  );
  
  combineLatest( a$, b$ ).pipe(
     tap(([userInput, {orbitDistance}]) => {
        render(canvas, gl, pipeline, userInput, orbitDistance);
      })
  ).subscribe()

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
    [0, 1, 0]  // Up direction
  );
  mat4.multiply(transformationMatrix, viewMatrix, transformationMatrix);

  const projectionMatrix = mat4.perspective(
    mat4.create(),
    // Field of View Y (angle between top and bottom planes of camera)
    glMatrix.toRadian(60.0), 
    // Aspect ratio
    canvas.width / canvas.height,
    0.1, // Near clipping distance
    100.0 // Far clipping distance
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
  transformationMatrix: mat4,
  screenSize: vec2 | null = null
) {
  pipeline.program.use(() => {
    pipeline.program.setMatrixUniform(transformationMatrix, `transformation`);

    if (pipeline.texture) {
    pipeline.program.setTextureUniform(pipeline.texture, `tex`, )
    }

    if (screenSize) {
      pipeline.program.setFloatUniform(screenSize, `screenSize`);
    }

    pipeline.vertexArray.render(gl.TRIANGLE_STRIP, 0, pipeline.vertexCount);
  });
}
