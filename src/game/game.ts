// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { mat4, vec2, vec3 } from 'gl-matrix';
import { fromEvent } from 'rxjs';
import { map, mergeMap, startWith, takeUntil, tap } from 'rxjs/operators';
import forestPicture from '../assets/forest.jpg';
import { frag } from './shader.frag';
import { vertex } from './shader.vertex';

interface UserInput {
  initialMouseClipSpace: vec2;
  currentMouseClipSpace: vec2;
  interactions: {
    rotate: boolean;
    scale: boolean;
    translate: boolean;
  };
}

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

  /*
   * Setup Shaders
   */

  // Create the WebGL shader id. This does nothing
  // until you use the ID in other functions
  const webGlVertexShaderId = gl.createShader(gl.VERTEX_SHADER);

  if (!webGlVertexShaderId) {
    throw new Error(`Couldn't create the vertex shader`);
  }

  // Tells WebGL what shader code is (the GLSL)
  gl.shaderSource(webGlVertexShaderId, vertex);

  // This attempts to compiler the shader code
  gl.compileShader(webGlVertexShaderId);

  // This queries for any errors in the compilation process.
  if (!gl.getShaderParameter(webGlVertexShaderId, gl.COMPILE_STATUS)) {
    throw new Error(
      `Couldn't compile the vertex shader. ${gl.getShaderInfoLog(
        webGlVertexShaderId
      )}`
    );
  }

  // --------------------------------

  const webGlFragShaderId = gl.createShader(gl.FRAGMENT_SHADER);

  if (!webGlFragShaderId) {
    throw new Error(`Couldn't create the fragment shader`);
  }

  gl.shaderSource(webGlFragShaderId, frag);

  gl.compileShader(webGlFragShaderId);

  if (!gl.getShaderParameter(webGlFragShaderId, gl.COMPILE_STATUS)) {
    throw new Error(
      `Couldn't compile the fragment shader. ${gl.getShaderInfoLog(
        webGlFragShaderId
      )}`
    );
  }

  // create a program to link the shaders
  const glProgramId = gl.createProgram();

  if (!glProgramId) {
    throw new Error(`Couldn't create program`);
  }

  gl.attachShader(glProgramId, webGlVertexShaderId);
  gl.attachShader(glProgramId, webGlFragShaderId);

  // linking of the attached shaders
  gl.linkProgram(glProgramId);

  if (!gl.getProgramParameter(glProgramId, gl.LINK_STATUS)) {
    throw new Error(
      `Couldn't link the attached shaders. ${gl.getProgramInfoLog(glProgramId)}`
    );
  }

  gl.detachShader(glProgramId, webGlVertexShaderId);
  gl.detachShader(glProgramId, webGlFragShaderId);

  // -1 if couldn't find attribute
  const positionAttributeLocation = gl.getAttribLocation(
    glProgramId,
    `position`
  );

  if (positionAttributeLocation < 0) {
    throw new Error(`Failed to find attribute location for: 'position'`);
  }

  /*
   * Create vertex buffer
   */

  // create buffer on the GPU
  const vertexBufferId = gl.createBuffer();

  if (!vertexBufferId) {
    throw new Error(`Couldn't create the buffer.`);
  }

  // [-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0]
  // const positions = new Float32Array(
  //   Array.from({ length: 9 * 3 })
  //     .fill(null)
  //     .map(() => Math.random() * 2.0 - 1.0)
  // );
  const positions = new Float32Array([
    -0.5,
    -0.5,
    0,
    0.5,
    -0.5,
    0,
    0,
    0.5,
    0,
    1,
    1,
    0,
  ]);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  /*
   * Textures
   */
  const textureId = gl.createTexture();

  if (!textureId) {
    throw new Error(`Texture not available`);
  }

  gl.bindTexture(gl.TEXTURE_2D, textureId);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([255, 128, 5, 255])
  );

  const image = new Image();

  image.onload = () => {
    console.log(image.src);
  };

  image.src = forestPicture;

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

    // we now need to tranform that into clip space which goes
    // from -1,-1 (bottom left) to 1,1 (top right)
    const mousePositionClipSpace = vec2.scaleAndAdd(
      vec2.create(),
      vec2.fromValues(-1, -1),
      normalizedMousePositionViewportSpace,
      2
    );

    return mousePositionClipSpace;
  }

  userInput$
    .pipe(
      startWith(undefined),
      tap((userInput) => {
        render(
          canvas,
          gl,
          glProgramId,
          vertexBufferId,
          positionAttributeLocation,
          positions,
          textureId,
          userInput
        );
      })
    )
    .subscribe();
};

function render(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  glProgramId: WebGLProgram,
  vertexBufferId: WebGLBuffer,
  positionAttributeLocation: number,
  positions: Float32Array,
  textureId: WebGLTexture,
  userInput?: UserInput
) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // set the viewport
  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

  gl.useProgram(glProgramId);

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

  // set uniforms
  gl.uniformMatrix4fv(
    gl.getUniformLocation(
      glProgramId,
      // name of the variable on the shader side
      `transformation`
    ),
    // always false for now
    false,
    transformationMatrix
  );

  // set texture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, textureId);

  gl.uniform1i(
    gl.getUniformLocation(
      glProgramId,
      // name of the variable on the shader side
      `tex`
    ),
    0
  );

  // bind buffers here
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);

  gl.enableVertexAttribArray(positionAttributeLocation);
  const VECTOR_SIZE = 3;
  gl.vertexAttribPointer(
    positionAttributeLocation,
    VECTOR_SIZE,
    gl.FLOAT,
    // no idea what that is :D
    false,
    0,
    0
  );

  // gl.POINTS
  // gl.LINES
  // gl.LINE_STRIP
  // gl.TRIANGLES
  // gl.TRIANGLE_STRIP
  // gl.TRIANGLE_FAN
  gl.drawArrays(gl.TRIANGLE_FAN, 0, positions.length / VECTOR_SIZE);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // stop manipulating our program
  gl.useProgram(null);
}
