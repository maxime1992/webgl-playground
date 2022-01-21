precision highp float;
precision highp int;

// Data that is passed a WebGL buffer and will
// probably change during the render process.
attribute float vertex_index;

/*
 * Comment!
 */
void main() {
  // render with GL_TRIANGLE_STRIP

  int index = int(vertex_index);
  
  if (index == 0) {
    gl_Position = vec4(-1, -1, 0.5, 1);
  
  } else if (index == 1) {
    gl_Position = vec4(+1, -1, 0.5, 1);
  
  } else if (index == 2) {
    gl_Position = vec4(-1, +1, 0.5, 1);
  
  } else if (index == 3) {
    gl_Position = vec4(+1, +1, 0.5, 1);
  }
}
