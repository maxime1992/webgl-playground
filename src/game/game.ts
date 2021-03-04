// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { mat4, vec2, vec3 } from 'gl-matrix';
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
  bufferId: WebGLBuffer;
  textureId: WebGLTexture;
  frameBufferId: WebGLFramebuffer | null;
  positionAttributeLocation: number;
  texCAttributeLocation: number;
}

// will do later on
// function renderPassToFrameBuffer(pipeline: Pipeline):void {
// }

function createBuffer(
  gl: WebGLRenderingContext,
  vboData: Float32Array
): WebGLBuffer {
  // create buffer on the GPU
  const bufferId = gl.createBuffer();

  if (!bufferId) {
    throw new Error(`Couldn't create the buffer.`);
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, bufferId);
  gl.bufferData(gl.ARRAY_BUFFER, vboData, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return bufferId;
}

function createTexture(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  data: ArrayBufferView | null
): WebGLTexture {
  const frameBufferTextureId = gl.createTexture();

  if (!frameBufferTextureId) {
    throw new Error(`Couldn't create a texture`);
  }

  gl.bindTexture(gl.TEXTURE_2D, frameBufferTextureId);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    width,
    height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    data
  );
  // set the filtering so we don't need mips
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  return frameBufferTextureId;
}

function updateTexture(
  gl: WebGLRenderingContext,
  textureId: WebGLTexture,
  image: HTMLImageElement
): void {
  // https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Using_textures_in_WebGL

  gl.bindTexture(gl.TEXTURE_2D, textureId);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  // WebGL1 has different requirements for power of 2 images
  // vs non power of 2 images so check if the image is a
  // power of 2 in both dimensions.
  if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
    // Yes, it's a power of 2. Generate mips.
    gl.generateMipmap(gl.TEXTURE_2D);
  } else {
    // No, it's not a power of 2. Turn off mips and set
    // wrapping to clamp to edge
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      // other option `gl.NEAREST`
      gl.LINEAR
    );
  }

  gl.bindTexture(gl.TEXTURE_2D, null);
}

function createFrameBuffer(
  gl: WebGLRenderingContext,
  width: number,
  height: number,
  frameBufferTextureId: WebGLTexture
) {
  const frameBufferId = gl.createFramebuffer();

  if (!frameBufferId) {
    throw new Error(`Couldn't create a framebuffer`);
  }

  // simply to define the depth attachment that we don't really use
  // and pass it to the frame buffer which requires it but we're only
  // interested in the color attachment (webgl texture) of the framebuffer
  const renderBufferId = gl.createRenderbuffer();

  if (!renderBufferId) {
    throw new Error(`Couldn't create a render buffer`);
  }

  gl.bindRenderbuffer(gl.RENDERBUFFER, renderBufferId);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

  gl.bindFramebuffer(gl.FRAMEBUFFER, frameBufferId);
  gl.bindTexture(gl.TEXTURE_2D, frameBufferTextureId);

  gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    renderBufferId
  );
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    frameBufferTextureId,
    0
  );

  const framebufferStatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  switch (framebufferStatus) {
    case gl.FRAMEBUFFER_COMPLETE:
      break;
    case gl.FRAMEBUFFER_INCOMPLETE_ATTACHMENT:
      throw new Error(
        `Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_ATTACHMENT`
      );
    case gl.FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT:
      throw new Error(
        `Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT`
      );
    case gl.FRAMEBUFFER_INCOMPLETE_DIMENSIONS:
      throw new Error(
        `Incomplete framebuffer: FRAMEBUFFER_INCOMPLETE_DIMENSIONS`
      );
    case gl.FRAMEBUFFER_UNSUPPORTED:
      throw new Error(`Incomplete framebuffer: FRAMEBUFFER_UNSUPPORTED`);
    default:
      throw new Error(`Incomplete framebuffer: Unknown status`);
  }

  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.bindTexture(gl.TEXTURE_2D, null);

  return frameBufferId;
}

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

  const vertexBufferId = createBuffer(gl, vboData);

  const vertexCount = positions.length / VECTOR_3_SIZE;

  /*
   * Textures
   */

  const textureId = createTexture(gl, 1, 1, null);

  const image$ = new Observable((observer) => {
    const image = new Image();

    image.onload = () => {
      updateTexture(gl, textureId, image);

      observer.next();
      observer.complete();
    };

    image.src = forestPicture;
  });

  const frameBufferTextureId = createTexture(
    gl,
    canvas.clientWidth,
    canvas.clientHeight,
    null
  );

  // the idea of the frame buffer is that we can render onto
  // it instead of the screen but it lets us pass that render
  // buffer to other transformation pipelines if we need to
  // (for example to blur a picture)
  const frameBufferId = createFrameBuffer(
    gl,
    canvas.clientWidth,
    canvas.clientHeight,
    frameBufferTextureId
  );

  const pipeline: Pipeline = {
    program: program,
    bufferId: vertexBufferId,
    textureId: textureId,
    frameBufferId: frameBufferId,
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

  const filterVertexBufferId = createBuffer(gl, filterVboData);

  const filterPipeline: Pipeline = {
    program: filterProgram,
    bufferId: filterVertexBufferId,
    textureId: frameBufferTextureId,
    frameBufferId: null,
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
        render(canvas, gl, pipeline, filterPipeline, vertexCount, userInput);
      })
    )
    .subscribe();
};

function isPowerOf2(value) {
  return (value & (value - 1)) == 0;
}

function render(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  filterPipeline: Pipeline,
  vertexCount: number,
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

  gl.bindFramebuffer(gl.FRAMEBUFFER, pipeline.frameBufferId);

  // set the viewport and clear the framebuffer
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderPipeline(gl, pipeline, transformationMatrix, vertexCount);
  // ^ This rendered to the framebuffer referenced by `frameBufferId`.
  // That framebuffer is storing the color values in the texture
  // referenced by `frameBufferTextureId`. Now we can bind the default
  // framebuffer (the screen), bind the `frameBufferTextureId` texture,
  // and re-render the scene to view the results.

  gl.bindFramebuffer(
    gl.FRAMEBUFFER,
    // reset to the default one which is just to draw on screen
    null
  );

  // set the viewport and clear the framebuffer
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  renderPipeline(
    gl,
    filterPipeline,
    mat4.create(),
    vertexCount,
    vec2.fromValues(canvas.width, canvas.height)
  );
}

function renderPipeline(
  gl: WebGLRenderingContext,
  pipeline: Pipeline,
  transformationMatrix: mat4,
  vertexCount: number,
  screenSize: vec2 | null = null
) {
  pipeline.program.use(() => {
    pipeline.program.setMatrixUniform(transformationMatrix, `transformation`);

    // set texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pipeline.textureId);

    gl.uniform1i(
      gl.getUniformLocation(
        pipeline.program.getProgramId(),
        // name of the variable on the shader side
        `tex`
      ),
      0
    );

    if (screenSize) {
      pipeline.program.setFloatUniform(screenSize, `screenSize`);
    }

    // bind buffers here
    gl.bindBuffer(gl.ARRAY_BUFFER, pipeline.bufferId);

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
      vertexCount * VECTOR_3_SIZE * NUM_BYTES_IN_FLOAT
    );

    // gl.POINTS
    // gl.LINES
    // gl.LINE_STRIP
    // gl.TRIANGLES
    // gl.TRIANGLE_STRIP
    // gl.TRIANGLE_FAN
    // https://www.3dgep.com/wp-content/uploads/2011/02/OpenGL-Primitives.png
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, vertexCount);
  });
}
