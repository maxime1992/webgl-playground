export const vertex = `
precision highp float;
precision highp int;

attribute vec3 position;

uniform vec3 translation;

void main() {
  gl_Position = vec4(position + translation, 1);
}
`;
