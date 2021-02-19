export const frag = `
precision highp float;
precision highp int;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

varying vec2 texCoor;

void main() {
  vec4 textureRgba = texture2D(tex, texCoor);
  gl_FragColor = textureRgba;
  // gl_FragColor = vec4(texCoor, 1, 1.0);
}
`;
