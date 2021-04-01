precision highp float;
precision highp int;

const int COLORING_POSITIONS           = 0;
const int COLORING_NORMALS             = 1;
const int COLORING_TEXTURE_COORDINATES = 2;
const int COLORING_VERTEX_COLORS       = 3;
const int COLORING_UNIFORM_COLOR       = 4;
const int COLORING_TEXTURE             = 5;
const int COLORING_WHITE               = 6;

/*
 * Inputs
 */
varying vec3 worldPosition;
varying vec3 worldNormal;
varying vec2 uv;
varying vec3 vertexColor;

/*
 * Uniforms
 */
uniform int       coloring;
uniform vec3      uniformColor;
uniform float     opacity;
uniform sampler2D tex;

/*
 * Set the output color based on the value of `coloring`.
 */
void main() {
  vec3 shapeColor = vec3(1.0, 1.0, 1.0);

  /*
   * Coloring
   */
  if (coloring == COLORING_POSITIONS) {
    shapeColor = worldPosition;

  } else if (coloring == COLORING_NORMALS) {
    shapeColor = worldNormal * 0.5 + 0.5;// between 0 and 1

  } else if (coloring == COLORING_TEXTURE_COORDINATES) {
    shapeColor = vec3(uv, 1.0);

  } else if (coloring == COLORING_VERTEX_COLORS) {
    shapeColor = vertexColor;

  } else if (coloring == COLORING_UNIFORM_COLOR) {
    shapeColor = uniformColor;

  } else if (coloring == COLORING_TEXTURE) {
    shapeColor = texture2D(tex, uv).rgb;

  } else { // coloring == COLORING_WHITE
  }

  gl_FragColor = vec4(shapeColor, opacity);
}
