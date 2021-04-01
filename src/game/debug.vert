precision highp float;
precision highp int;

/*
 * Inputs
 */
attribute vec3 localPosition;
attribute vec3 localNormal;
attribute vec2 textureCoordinates;
attribute vec3 color;

/*
 * Uniforms
 */
uniform mat4 worldFromLocal; 
uniform mat3 worldFromLocalNormal; 
uniform mat4 projectionFromWorld; 

/*
 * Outputs
 */
varying vec3 worldPosition;
varying vec3 worldNormal;
varying vec2 uv;
varying vec3 vertexColor;

/*
 * Copies the inputs to the outputs with the proper transformations
 */
void main() {
  worldPosition = vec3(worldFromLocal * vec4(localPosition, 1.0));
  worldNormal   = worldFromLocalNormal * localNormal;
  uv            = textureCoordinates;
  vertexColor   = color;
  
  gl_Position   = projectionFromWorld * vec4(worldPosition, 1);
}
