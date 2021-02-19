export const filterFrag = `
precision highp float;
precision highp int;

// Data that is passed in from TS and remains 
// constant during a single render pass.
uniform sampler2D tex;

uniform vec2 screenSize;

void main() {
  mat3 filter = mat3(
    vec3(-1, 0, 1),
    vec3(-2, 0, 2),
    vec3(-1, 0, 1)
  );

  vec3 finalValue = vec3(0.0);

  for (int r = 0; r < 2; ++r) {
    for (int c = 0; c < 2; ++c) {
      float filterVal = filter[r][c];
      vec2 texCoor = (gl_FragCoord.xy + vec2(r - 1, c - 1)) / vec2(1920,1080);
      vec3 textureRgba = texture2D(tex, texCoor).rgb;
      finalValue += abs(textureRgba * filterVal);
    }
  }

  gl_FragColor = vec4(finalValue, 1.0);
}
`;
