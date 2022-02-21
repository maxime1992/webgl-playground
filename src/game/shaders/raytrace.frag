precision highp float;
precision highp int;


/*
 * Constants
 */
const float INF = 10000.0;
const float PI  = 3.14159265359;

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

// Camera variables
uniform mat3 cameraBasis;
uniform vec3 eyePosition;

uniform vec2 viewportSize; // (w, h)

//////////////////// ^^^ From Typescript ^^^ ////////////////////////////
/////////////////////////////////////////////////////////////////////////



bool isZero(in float x) {
  const float EQN_EPS = 1e-16;
  return x > -EQN_EPS && x < EQN_EPS;
}

/// brief Solves an equation of the form ax^2 + bx + c = 0
vec2 solveQuadratic(in float a, in float b, in float c) {
  float p;
  float q;
  float D;

  /* normal form: x^2 + px + q = 0 */

  p = b / (2.0 * a);
  q = c / a;

  D = p * p - q;

  if (isZero(D)) {
    return vec2(-p, INF);
  } else if (D < 0.0) {
    return vec2(INF, INF);
  } else {
    /* if (D > 0) */
    float sqrt_D = sqrt(D);
    return vec2(sqrt_D - p, -sqrt_D - p);
  }
}

const float circleRadius = 1.0;

// Circle:
// p.x^2 + p.y^2 = r^2
//
// Point from ray:
// r.o + r.d * t = p
//
// Substitute (r.o + r.d * t) for p
// in (p.x^2 + p.y^2 = r^2) and rearrange
// to get:
//
// 0 = t^2 * r.d * r.d
//     + t * 2 * r.o * r.d
//     + r.o * r.o - r^2
//
float computeIntersections(in vec3 origin, in vec3 direction) {
  float a = dot(direction, direction);
  float b = 2.0 * dot(origin, direction);
  float c = dot(origin, origin) - circleRadius * circleRadius;
  
  vec2 ts = solveQuadratic(a, b, c);

  return min(ts.x, ts.y);
}

vec4 getWorldColorAndDistance(in vec3 origin, in vec3 direction) {

  float distance_along_ray = computeIntersections(origin, direction);

  vec3 color = vec3(direction * 0.5 + 0.5);

  // u = atan2(n.x, n.z) / (2*pi) + 0.5;
  // v = n.y * 0.5 + 0.5;

  if (0.0 < distance_along_ray && distance_along_ray < INF) {
    vec3 worldPosition = origin + direction * distance_along_ray; // r.o + r.d * t;
    vec3 worldNormal = normalize(worldPosition);
    
    /*
     * Coloring
     */
    if (coloring == COLORING_POSITIONS) {
      color = worldPosition;

    } else if (coloring == COLORING_NORMALS) {
      color = worldNormal * 0.5 + 0.5;// between 0 and 1

    } else if (coloring == COLORING_TEXTURE_COORDINATES) {
      // color = vec3(uv, 1.0);

    } else if (coloring == COLORING_VERTEX_COLORS) {
      // color = vertexColor;

    } else if (coloring == COLORING_UNIFORM_COLOR) {
      color = uniformColor;

    } else if (coloring == COLORING_TEXTURE) {
      // color = texture2D(tex, uv).rgb;

    } else { // coloring == COLORING_WHITE
    }
    
    float intensity = 0.0;

    if (shading == SHADING_NONE) {
      intensity = 1.0;

    } else if (shading == SHADING_LAMBERTIAN) {
      intensity += max(0.0, dot(worldNormal, -normalize(DIRECTIONAL_LIGHT)));
    }

    intensity = clamp(intensity, 0.0, 1.0);

    color *= intensity;
  }

  return vec4(color, distance_along_ray);
}

float fresnelApprox(in float n1, in float n2, in vec3 normal, in vec3 dir) {
  float R0 = (n1 - n2) / (n1 + n2);
  R0 *= R0;
  return R0 + (1.0 - R0) * pow(dot(normal, dir), 5.0);
}


/*
 * Set the output color based on the value of `coloring`.
 */
void main() {

  vec2 screenPos = gl_FragCoord.xy; // (0.5, 0.5) => ((w-1).5, (h-1).5)
  vec2 normalizedScreenPos = screenPos / viewportSize; // (0, 0) => (1, 1)
  vec2 clipPos = normalizedScreenPos * 2.0 - 1.0;// (-1, -1) => (1, 1)

  vec3 right = cameraBasis[0];
  vec3 up    = cameraBasis[1];
  vec3 look  = cameraBasis[2];

  // Create the ray from the camera vectors
  vec3 rayOrigin    = eyePosition;
  vec3 rayDirection = normalize((clipPos.x * right) + (clipPos.y * up) + look);

  vec4 color_and_distance = getWorldColorAndDistance(rayOrigin, rayDirection);

  vec3  color              = color_and_distance.rgb;
  float distance_along_ray = color_and_distance.w;

  if (0.0 < distance_along_ray && distance_along_ray < INF) {
    vec3 worldPosition = rayOrigin + rayDirection * distance_along_ray; // r.o + r.d * t;
    vec3 worldNormal   = normalize(worldPosition);

    const float bumpEps     = 1.0e-4;
    const float air_index   = 1.0;
    const float water_index = 1.333;

    vec3 reflectiveDir = reflect(rayDirection, worldNormal);
    vec3 refractiveDir = refract(rayDirection, worldNormal, air_index / water_index);

    vec3 reflectiveColor = getWorldColorAndDistance(worldPosition + worldNormal * bumpEps, reflectiveDir).rgb;
    vec3 refractiveColor = getWorldColorAndDistance(worldPosition - worldNormal * bumpEps, refractiveDir).rgb;

    // Fresnel equation
    float F = fresnelApprox(air_index, water_index, worldNormal, -rayDirection);
    color   = mix(reflectiveColor, refractiveColor, F);
  }

  gl_FragColor = vec4(color, 1.0);
}
