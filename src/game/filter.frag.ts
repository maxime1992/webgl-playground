export const filterFrag = `
precision highp float;
precision highp int;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

varying vec2 texCoor;

void main() {
  vec4 textureRgba = texture2D(tex, texCoor);
  float grayScale = (textureRgba.r + textureRgba.g + textureRgba.b) / 3.0;
  gl_FragColor = vec4(vec3(grayScale), textureRgba.a);
  // gl_FragColor = vec4(texCoor, 1, 1.0);
}
`;
