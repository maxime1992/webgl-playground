precision highp float;
precision highp int;

// Data that is passed a WebGL buffer and will
// probably change during the render process.
attribute float index;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform mat4 transformation; 

uniform mat2 positions;

/*
 * Comment!
 */
void main() {
  vec2 position = positions[int(index)];
  gl_Position = transformation * vec4(position, 0, 1);
  gl_PointSize = 5.0;
}
