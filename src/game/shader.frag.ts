export const frag = `
precision highp float;
precision highp int;

varying vec3 color; // this is data that is shared between shaders

void main() {
  gl_FragColor = vec4(color, 1.0);
}
`;
