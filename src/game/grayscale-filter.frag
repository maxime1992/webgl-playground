precision highp float;
precision highp int;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

uniform vec2 screenSize;

void main() {
  vec2 texCoor = gl_FragCoord.xy / screenSize;
  vec3 textureRgba = texture2D(tex, texCoor).rgb;
  float grayScale = (textureRgba.x + textureRgba.y + textureRgba.z) / 3.0;
  gl_FragColor = vec4(vec3(grayScale), 1.0);
}
