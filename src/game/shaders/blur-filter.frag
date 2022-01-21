precision highp float;
precision highp int;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

uniform vec2 screenSize;

void main() {
  const int filterRadius = 15;
  const int filterSize = filterRadius * 2 + 1;
  const int totalPixelsInFilter = filterSize * filterSize;

  vec3 averageColor = vec3(0.0);

  for (int r = -filterRadius; r <= filterRadius; ++r) {
    for (int c = -filterRadius; c <= filterRadius; ++c) {
      vec2 texCoor = (gl_FragCoord.xy + vec2(c, r)) / screenSize;
      vec3 textureRgb = texture2D(tex, texCoor).rgb;
      averageColor += textureRgb / float(totalPixelsInFilter);
    }
  }
  gl_FragColor = vec4(averageColor, 1.0);
}
