precision highp float;
precision highp int;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

uniform vec2 screenSize;

float compute(in vec2 offset, in float scale) {
  vec2 texCoor = (gl_FragCoord.xy + offset) / screenSize;
  vec3 textureRgb = texture2D(tex, texCoor).rgb;
  float grayScale = (textureRgb.r + textureRgb.g + textureRgb.b) / 3.0;
  return grayScale * scale;
}

void main() {
  float Lx = compute(vec2(-1, +1), 1.0) + compute(vec2(1, +1), -1.0)
           + compute(vec2(-1, +0), 2.0) + compute(vec2(1, +0), -2.0);
           + compute(vec2(-1, -1), 1.0) + compute(vec2(1, -1), -1.0);
  float Ly = compute(vec2(+1, -1), 1.0) + compute(vec2(+1, 1), -1.0)
           + compute(vec2(+0, -1), 2.0) + compute(vec2(+0, 1), -2.0);
           + compute(vec2(-1, -1), 1.0) + compute(vec2(-1, 1), -1.0);

  float L_grad = sqrt(Lx * Lx + Ly * Ly);

  float threshold = 0.55;

  gl_FragColor = vec4(vec3((L_grad > threshold ? 1.0 : 0.0)), 1.0);
}
