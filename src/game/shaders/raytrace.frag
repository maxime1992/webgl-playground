precision highp float;
precision highp int;

/*
 * Constant variables specific to this shader.
 */
const int COLORING_POSITIONS           = 0;
const int COLORING_NORMALS             = 1;
const int COLORING_TEXTURE_COORDINATES = 2;
const int COLORING_VERTEX_COLORS       = 3;
const int COLORING_UNIFORM_COLOR       = 4;
const int COLORING_TEXTURE             = 5;
const int COLORING_WHITE               = 6;

const int SHADING_NONE                 = 0;
const int SHADING_LAMBERTIAN           = 1;

const vec3 DIRECTIONAL_LIGHT            = -vec3(3, 5, 2);

/////////////////////////////////////////////////////////////////////////
//////////////////// vvv From Typescript vvv ////////////////////////////

/*
 * Uniforms
 *
 * Passed from TS to any shader. Read only. The values 
 * will NOT change for each vertex or fragment.
 */
uniform int       coloring;
uniform vec3      uniformColor;
uniform sampler2D tex;
uniform int       shading;

uniform vec2 viewportSize; // (w, h)

//////////////////// ^^^ From Typescript ^^^ ////////////////////////////
/////////////////////////////////////////////////////////////////////////

/*
 * Set the output color based on the value of `coloring`.
 */
void main() {

  vec2 screenPos = gl_FragCoord.xy; // (0.5, 0.5) => ((w-1).5, (h-1).5)
  vec2 normalizedScreenPos = screenPos / viewportSize; // (0, 0) => (1, 1)
  vec2 clipPos = normalizedScreenPos * 2.0 - 1.0;// (-1, -1) => (1, 1)

  vec3 surfaceColor = vec3(clipPos, 0.0);

  // /*
  //  * Coloring
  //  */
  // if (coloring == COLORING_POSITIONS) {
  //   surfaceColor = worldPosition;

  // } else if (coloring == COLORING_NORMALS) {
  //   surfaceColor = worldNormal * 0.5 + 0.5;// between 0 and 1

  // } else if (coloring == COLORING_TEXTURE_COORDINATES) {
  //   surfaceColor = vec3(uv, 1.0);

  // } else if (coloring == COLORING_VERTEX_COLORS) {
  //   surfaceColor = vertexColor;

  // } else if (coloring == COLORING_UNIFORM_COLOR) {
  //   surfaceColor = uniformColor;

  // } else if (coloring == COLORING_TEXTURE) {
  //   surfaceColor = texture2D(tex, uv).rgb;

  // } else { // coloring == COLORING_WHITE
  // }
  
  float intensity = 1.0;
  
  // if (shading == SHADING_NONE) {
  //   intensity = 1.0;

  // } else if (shading == SHADING_LAMBERTIAN) {
  //   intensity += 0.15; // ambient
  //   intensity += max(0.0, dot(worldNormal, -normalize(DIRECTIONAL_LIGHT)));
  // }

  // intensity = clamp(intensity, 0.0, 1.0);

  // if (!gl_FrontFacing) {
  //   surfaceColor *= 0.3;
  // }

  gl_FragColor = vec4(surfaceColor * intensity, 1.0);
}
