// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { glMatrix, mat4, vec2, vec3 } from 'gl-matrix';
import { fromEvent, merge, Observable } from 'rxjs';
import {
  map,
  mapTo,
  mergeMap,
  startWith,
  takeUntil,
  tap,
} from 'rxjs/operators';
import forestPicture from '../assets/forest-low-quality.jpg';
import filterFrag from './edge-filter.frag';
import { Program } from './program';
import { Shader } from './shader';
import { Texture } from './texture';
import { Buffer } from './buffer';
import { Framebuffer } from './framebuffer';
import frag from './shader.frag';
import vert from './shader.vert';

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
  texture: Texture;
  framebuffer: Framebuffer | null;
  positionAttributeLocation: number;
  texCAttributeLocation: number;
  vertexCount: number;
}

// will do later on
// function renderPassToFrameBuffer(pipeline: Pipeline):void {
// }


function getAttributeLocation(
  gl: WebGLRenderingContext,
  glProgramId: WebGLProgram,
  attributeName: string
) {
  // -1 if couldn't find attribute
  const positionAttributeLocation = gl.getAttribLocation(
    glProgramId,
    attributeName
  );

  if (positionAttributeLocation < 0) {
    throw new Error(`Failed to find attribute location for: 'position'`);
  }
  return positionAttributeLocation;
}

const VECTOR_3_SIZE = 3;
const VECTOR_2_SIZE = 2;
const NUM_BYTES_IN_FLOAT = 4;

export const startGame = () => {
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

  const texture = new Texture(gl, 1, 1);

  const image$ = new Observable((observer) => {
    const image = new Image();

    image.onload = () => {
      texture.updateTexture(  image);

      observer.next();
      observer.complete();
    };

    image.src = forestPicture;
  });

  const frameBufferTexture = new Texture(
    gl,
    canvas.clientWidth,
    canvas.clientHeight,
  );

  // the idea of the frame buffer is that we can render onto
  // it instead of the screen but it lets us pass that render
  // buffer to other transformation pipelines if we need to
  // (for example to blur a picture)
  const frameBuffer = new Framebuffer(
    gl,
    canvas.clientWidth,
    canvas.clientHeight,
    frameBufferTexture
  );

  const pipeline: Pipeline = {
    program,
    buffer: vertexBuffer,
    texture,
    framebuffer: frameBuffer,
    positionAttributeLocation: getAttributeLocation(
      gl,
      program.getProgramId(),
      'position'
    ),
    texCAttributeLocation: getAttributeLocation(
      gl,
      program.getProgramId(),
      'texC'
    ),
    vertexCount
  };

  const filterFragment = new Shader(gl, {
    type: gl.FRAGMENT_SHADER,
    source: filterFrag,
  });

  const filterProgram = new Program(
    gl,
    // we use the same vertex as the first one for now
    // as we don't do anything special on the vertex level
    // and for the transformation we can just pass the identity matrix
    vertex,
    filterFragment
  );

  const filterPositions = new Float32Array([
    // bottom left
    -1,
    -1,
    0,
    // bottom right
    1,
    -1,
    0,
    // top left
    -1,
    1,
    0,
    // top right
    1,
    1,
    0,
  ]);

  const filterTextureCoordinates = new Float32Array([
    // bottom left
    0,
    0,
    // bottom right (1,1)
    1,
    0,
    // top left (0,0)
    0,
    1,
    // top right
    1,
    1,
  ]);

  /*
  (0,0)-(1,0)
     \
      \
       \
        \
  (0,1)-(1,1)
  */

  const filterVboData = new Float32Array([
    ...filterPositions,
    ...filterTextureCoordinates,
  ]);

  const filterVertexBuffer = new Buffer(gl, filterVboData);

  const filterPipeline: Pipeline = {
    program: filterProgram,
    buffer: filterVertexBuffer,
    texture: frameBufferTexture,
    framebuffer: null,
    positionAttributeLocation: getAttributeLocation(
      gl,
      filterProgram.getProgramId(),
      'position'
    ),
    texCAttributeLocation: getAttributeLocation(
      gl,
      filterProgram.getProgramId(),
      'texC'
    ),
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

  const userInput$ = down$.pipe(
    mergeMap((downMouseEvent) =>
      move$.pipe(
        map((moveMouseEvent) =>
          getUserInput(downMouseEvent, moveMouseEvent, canvas)
        ),
        takeUntil(up$)
      )
    )
  );

  function getUserInput(
    initialMouseEvent: MouseEvent,
    currentMouseEvent: MouseEvent,
    canvas: HTMLCanvasElement
  ): UserInput {
    return {
      initialMouseClipSpace: mousePositionViewportSpaceToClipSpace(
        [initialMouseEvent.clientX, initialMouseEvent.clientY],
        canvas
      ),
      currentMouseClipSpace: mousePositionViewportSpaceToClipSpace(
        [currentMouseEvent.clientX, currentMouseEvent.clientY],
        canvas
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
    canvas: HTMLCanvasElement
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
      vec2.fromValues(canvas.clientWidth, canvas.clientHeight)
    );

    // we now need to transform that into clip space which goes
    // from -1,-1 (bottom left) to 1,1 (top right)
    const mousePositionClipSpace = vec2.scaleAndAdd(
      vec2.create(),
      vec2.fromValues(-1, -1),
      normalizedMousePositionViewportSpace,
      2
    );

    return mousePositionClipSpace;
  }

  merge(userInput$, image$.pipe(mapTo(undefined)))
    .pipe(
      startWith(undefined),
      tap((userInput) => {
        render(canvas, gl, pipeline, filterPipeline, userInput);
      })
    )
    .subscribe();
};

function render(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  filterPipeline: Pipeline,
  userInput?: UserInput
) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  let transformationMatrix = mat4.create();

  if (userInput) {
    if (userInput.interactions.scale) {
      const scaleMatrix = mat4.fromScaling(
        mat4.create(),
        vec3.fromValues(
          userInput.currentMouseClipSpace[0], // x
          userInput.currentMouseClipSpace[1], // y
          1 // z
        )
      );

      mat4.multiply(transformationMatrix, scaleMatrix, transformationMatrix);
    }

    if (userInput.interactions.rotate) {
      const startVec = vec2.normalize(
        vec2.create(),
        userInput.initialMouseClipSpace
      );
      const endVec = vec2.normalize(
        vec2.create(),
        userInput.currentMouseClipSpace
      );
      const startAngle = Math.atan2(startVec[1], startVec[0]);
      const endAngle = Math.atan2(endVec[1], endVec[0]);
      const rotationMatrix = mat4.fromRotation(
        mat4.create(),
        endAngle - startAngle,
        vec3.fromValues(0, 0, 1)
      );

      mat4.multiply(transformationMatrix, rotationMatrix, transformationMatrix);
    }

    if (userInput.interactions.translate) {
      const translationMatrix = mat4.fromTranslation(
        mat4.create(),
        vec3.fromValues(
          userInput.currentMouseClipSpace[0], // x
          userInput.currentMouseClipSpace[1], // y
          0 // z
        )
      );

      mat4.multiply(
        transformationMatrix,
        translationMatrix,
        transformationMatrix
      );
    }
  }

  // const viewMatrix = mat4.lookAt(
  //   mat4.create(),
  //   [1, 1, 1],
  //   [0, 0, 0],
  //   [0, 1, 0]
  // );
  // mat4.multiply(transformationMatrix, viewMatrix, transformationMatrix);

  // const projectionMatrix = mat4.perspective(
  //   mat4.create(),
  //   glMatrix.toRadian(60.0),
  //   canvas.width / canvas.height,
  //   0.1,
  //   100.0
  // );
  // mat4.multiply(transformationMatrix, projectionMatrix, transformationMatrix);

  pipeline.framebuffer?.scopeBind(() => {
    // set the viewport and clear the framebuffer
    gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    renderPipeline(gl, pipeline, transformationMatrix);
    // ^ This rendered to the framebuffer referenced by `frameBufferId`.
    // That framebuffer is storing the color values in the texture
    // referenced by `frameBufferTextureId`. Now we can bind the default
    // framebuffer (the screen), bind the `frameBufferTextureId` texture,
    // and re-render the scene to view the results.
  })  

  // set the viewport and clear the framebuffer
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderPipeline(
    gl,
    filterPipeline,
    mat4.create(),
    vec2.fromValues(canvas.width, canvas.height)
  );
}

function renderPipeline(
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  transformationMatrix: mat4,
  screenSize: vec2 | null = null
) {
  pipeline.program.use(() => {
    pipeline.program.setMatrixUniform(transformationMatrix, `transformation`);

    pipeline.program.setTextureUniform(pipeline.texture, `tex`, )

    if (screenSize) {
      pipeline.program.setFloatUniform(screenSize, `screenSize`);
    }

    // bind buffers here
    pipeline.buffer.scopeBind(() => {
      gl.enableVertexAttribArray(pipeline.positionAttributeLocation);
  
      gl.vertexAttribPointer(
        pipeline.positionAttributeLocation,
        VECTOR_3_SIZE,
        gl.FLOAT,
        // no idea what that is :D
        false,
        0,
        0
      );
  
      gl.enableVertexAttribArray(pipeline.texCAttributeLocation);
  
      gl.vertexAttribPointer(
        pipeline.texCAttributeLocation,
        VECTOR_2_SIZE,
        gl.FLOAT,
        // no idea what that is :D
        false,
        0,
        // offset in bytes where the texture coordinates starts
        pipeline.vertexCount * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT
      );
  
      // gl.POINTS
      // gl.LINES
      // gl.LINE_STRIP
      // gl.TRIANGLES
      // gl.TRIANGLE_STRIP
      // gl.TRIANGLE_FAN
      // https://www.3dgep.com/wp-content/uploads/2011/02/OpenGL-Primitives.png
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, pipeline.vertexCount);
    })
  });
}
