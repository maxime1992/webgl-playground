precision highp float;
precision highp int;

const float PI = 3.1415926535897932;
const float omega = 2.42;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

uniform vec2 screenSize;

float gaussian(in float x, in float y) {
  float denom = omega * omega * 2.0;
  float val1 = 1.0 / (denom * PI);
  float val2 = exp(-(x * x + y * y) / denom);
  return val1 * val2;
}

void main() {
  const int filterRadius = 10;
  const int filterSize = filterRadius * 2 + 1;
  const int totalPixelsInFilter = filterSize * filterSize;

  vec3 averageColor = vec3(0.0);

  for (int r = -filterRadius; r <= filterRadius; ++r) {
    for (int c = -filterRadius; c <= filterRadius; ++c) {
      vec2 texCoor = (gl_FragCoord.xy + vec2(c, r)) / screenSize;
      vec3 textureRgb = texture2D(tex, texCoor).rgb;
      averageColor += textureRgb * gaussian(float(c), float(r));
    }
  }
  gl_FragColor = vec4(averageColor, 1.0);
}
