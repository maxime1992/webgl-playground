precision highp float;
precision highp int;

/*
 * Inputs
 *
 * Passed from TS to the VERTEX shader. Read only.
 * The values may change for each vertex.
 */
attribute vec3 localPosition;
attribute vec3 localNormal;
attribute vec2 textureCoordinates;
attribute vec3 color;

/*
 * Uniforms
 *
 * Passed from TS to any shader. Read only. The values 
 * will NOT change for each vertex or fragment.
 */
uniform mat4 worldFromLocal;
uniform mat3 worldFromLocalNormal;
uniform mat4 projectionFromWorld;
uniform float timeInSeconds;

//////////////////// ^^^ From Typescript ^^^ ////////////////////////////
/////////////////////////////////////////////////////////////////////////
//////////////////// vvv   Shader only   vvv ////////////////////////////

/*
 * Varying Outputs (to fragment shader)
 *
 * Shader to shader. Values are interpolated.
 */
varying vec3 worldPosition;
varying vec3 worldNormal;
varying vec2 uv;
varying vec3 vertexColor;

/*
 * Copies the inputs to the outputs with the proper transformations
 */
void main() {
  // make shiftedPosition
  vec3 shiftedPosition = localPosition;
  shiftedPosition.z = 0.1 * sin(length(localPosition.xy) * 15.0 - timeInSeconds * 5.0); // "swizzling"

  worldPosition = vec3(worldFromLocal * vec4(shiftedPosition, 1.0));
  worldNormal   = worldFromLocalNormal * localNormal;
  uv            = textureCoordinates;
  vertexColor   = color;
  
  // Output in clipspace [-1, 1]
  gl_Position   = projectionFromWorld * vec4(worldPosition, 1);
}
