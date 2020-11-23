// vertex: run 1 time per vertex (points in the shape)
// fragment: run 1 time per pixel

import { frag } from './shader.frag';
import { vertex } from './shader.vertex';

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

  const positions = new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0, 0.5, 0]);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferId);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  /*
   * "Render loop"
   */

  renderLoop(
    canvas,
    gl,
    glProgramId,
    vertexBufferId,
    positionAttributeLocation,
    positions
  );
};

function renderLoop(
  canvas: HTMLCanvasElement,
  gl: WebGLRenderingContext,
  glProgramId: WebGLProgram,
  vertexBufferId: WebGLBuffer,
  positionAttributeLocation: number,
  positions: Float32Array
) {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.viewport(0, 0, canvas.clientWidth, canvas.clientHeight);

  gl.useProgram(glProgramId);

  // set uniforms
  gl.uniform3f(
    gl.getUniformLocation(
      glProgramId,
      // name of the variable on the shader side
      `translation`
    ),
    0,
    0,
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

  gl.drawArrays(gl.TRIANGLES, 0, positions.length / VECTOR_SIZE);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // stop manipulating our program
  gl.useProgram(null);

  window.requestAnimationFrame(() =>
    renderLoop(
      canvas,
      gl,
      glProgramId,
      vertexBufferId,
      positionAttributeLocation,
      positions
    )
  );
}
