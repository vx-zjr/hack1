export const smokeVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

export const smokeFragmentShader = `
  precision highp float;
  uniform float uTime;
  uniform vec2 uResolution;
  varying vec2 vUv;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m * m;
    m = m * m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
    for (int i = 0; i < 5; i++) {
      v += a * snoise(p);
      p = rot * p * 2.04 + 0.13;
      a *= 0.52;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime * 0.16;
    float n1 = fbm(p * 1.55 + vec2(t, -t * 0.9));
    float n2 = fbm(p * 2.85 + vec2(-t * 1.2, t * 1.35));
    float n3 = fbm(p * 4.4 + vec2(t * 1.8, t * 0.7));
    float smoke = smoothstep(-0.42, 0.62, n1 + n2 * 0.72 + n3 * 0.38);

    vec3 green = vec3(0.22, 1.0, 0.49);
    vec3 cyan = vec3(0.0, 0.88, 1.0);
    vec3 yellow = vec3(1.0, 0.75, 0.20);
    vec3 red = vec3(1.0, 0.18, 0.34);
    vec3 color = mix(green, cyan, smoothstep(-0.5, 0.8, n1));
    color = mix(color, yellow, smoothstep(0.25, 0.9, n2 + n3 * 0.35) * 0.62);
    color = mix(color, red, smoothstep(0.36, 1.05, n1 - n2 + n3 * 0.4) * 0.46);

    float vignette = smoothstep(1.35, 0.18, length(p));
    float alpha = smoke * vignette * 0.36;
    gl_FragColor = vec4(color, alpha);
  }
`;
