precision highp float;
precision highp int;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

varying vec2 texCoor;

void main() {
  if (gl_FrontFacing) {
    gl_FragColor = vec4(texCoor, 1, 1.0);
  } else {
    gl_FragColor = vec4(texCoor * 0.35, 0.35, 1.0);
  }
}
