export const entityVertexShader = `
  precision highp float;
  attribute vec3 fromPosition;
  attribute vec3 toPosition;
  attribute float phase;
  uniform float uTime;
  uniform float uMorph;
  uniform float uPointSize;
  uniform vec2 uPointer;
  uniform float uPointerActive;
  varying float vDepth;
  varying float vPulse;
  varying float vPointerGlow;

  float ease(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) * 0.5;
  }

  void main() {
    float localMorph = clamp(uMorph * 1.32 - phase * 0.28, 0.0, 1.0);
    float e = ease(localMorph);
    vec3 p = mix(fromPosition, toPosition, e);
    float pulse = sin(uTime * 2.2 + phase * 6.2831);
    float bulge = sin(e * 3.14159) * 0.24;
    p *= 1.0 + bulge;

    vec2 pointer = uPointer * vec2(1.7, 1.18);
    vec2 delta = p.xy - pointer;
    float d2 = dot(delta, delta);
    float field = exp(-d2 * 1.65) * uPointerActive;
    vec2 dir = normalize(delta + vec2(0.001));
    p.xy += dir * field * (0.28 + 0.16 * sin(uTime * 7.0 + phase * 24.0));
    p.z += field * sin(uTime * 5.4 + phase * 18.0) * 0.36;

    p += normalize(p + vec3(0.001)) * pulse * 0.015;
    p.y += sin(uTime * 0.9 + phase * 11.0) * 0.01;

    vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
    vDepth = clamp((-mvPosition.z - 1.0) / 5.0, 0.0, 1.0);
    vPulse = pulse * 0.5 + 0.5;
    vPointerGlow = field;
    gl_PointSize = uPointSize * (1.0 + vPulse * 0.38 + bulge * 0.5 + field * 1.35) * (1.0 / max(0.55, -mvPosition.z));
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const entityFragmentShader = `
  precision highp float;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vDepth;
  varying float vPulse;
  varying float vPointerGlow;

  void main() {
    vec2 c = gl_PointCoord - vec2(0.5);
    float d = dot(c, c);
    float alpha = smoothstep(0.25, 0.02, d) * uOpacity;
    vec3 color = uColor * (0.78 + vPulse * 0.38 + (1.0 - vDepth) * 0.25 + vPointerGlow * 0.85);
    gl_FragColor = vec4(color, alpha);
  }
`;
