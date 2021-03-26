precision highp float;
precision highp int;

// Data that is passed a WebGL buffer and will
// probably change during the render process.
attribute vec3 localPosition;
attribute vec3 localNormal;
attribute vec2 textureCoordinates;
attribute vec3 color;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform mat4 worldFromLocal; 
uniform mat3 worldFromLocalNormal; 
uniform mat4 projectionFromWorld; 

attribute vec3 worldPosition;
attribute vec3 worldNormal;
attribute vec2 uv;
attribute vec3 vertexColor;

/*
 * Comment!
 */
void main() {
  worldPosition = vec3(worldFromLocal * vec4(localPosition, 1.0));
  worldNormal   = worldFromLocalNormal * localPosition;
  uv            = textureCoordinates;
  vertexColor   = color;
  
  gl_Position   = projectionFromWorld * vec4(position, 1);
}
