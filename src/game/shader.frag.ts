export const frag = `
precision highp float;
precision highp int;

// Data that is created in the shader and
// shared between shaders.
varying vec3 color;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

void main() {
  vec4 textureRgba = texture2D(tex, vec2(0.5));
  gl_FragColor = textureRgba;
}
`;
