precision highp float;
precision highp int;

// Data that is passed a WebGL buffer and will
// probably change during the render process.
attribute vec3 position;

// texture coordinate
attribute vec2 texC;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform mat4 transformation; 

varying vec2 texCoor;

/*
 * Comment!
 */
void main() {
  gl_Position = transformation * vec4(position, 1);
  texCoor = texC;
  gl_PointSize = 5.0;
}
