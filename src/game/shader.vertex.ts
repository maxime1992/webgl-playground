export const vertex = `
precision highp float;
precision highp int;

// Data that is passed a WebGL buffer and will
// probably change during the render process.
attribute vec3 position;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform vec3 translation; 

// Data that is created in the shader and
// shared between shaders.
varying vec3 color;

/*
 * Comment!
 */
void main() {
  color = position * 0.5 + 0.5;
  gl_Position = vec4(position + translation, 1);
}
`;
