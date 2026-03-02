import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { EffectComposer, RenderPass, BloomEffect, VignetteEffect, ChromaticAberrationEffect, EffectPass } from 'postprocessing'

// ─── Quality tiers ────────────────────────────────────────────
const TIERS = [
  { scale: 0.75, steps: 64, warp: true  }, // HIGH
  { scale: 0.65, steps: 48, warp: true  }, // MED  (default start)
  { scale: 0.55, steps: 36, warp: false }, // LOW
  { scale: 0.50, steps: 24, warp: false }, // VERY_LOW
] as const

const BLOOM_INTENSITY = 1.5
const BLOOM_THRESHOLD = 0.60
const TARGET_FPS      = 30

// Random time offset — set once per page load (module-level).
// Survives React re-mounts (navigation), so the animation resumes
// rather than restarting. On refresh/first visit it's always a new seed.
const TIME_OFFSET = Math.random() * 1000

// ─── Vertex Shader ────────────────────────────────────────────
const vertexShader = /* glsl */ `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// ─── Fragment Shader ──────────────────────────────────────────
// Reference analysis:
//   - Pure black background (80% of image)
//   - Off-center white/ice slit (positioned ~1/3 from left)
//   - Slit is NOT uniform: wide caustic blob at top, pinched middle, wide bottom
//   - "Blue" is just bloom bleed from white light into black — not a blue fog
//   - Amber/brown = dark warm interruptions blocking the white slit
//   - The whole filament twists and evolves slowly
const fragmentShader = /* glsl */ `
precision highp float;

uniform float u_time;
uniform vec2  u_resolution;
uniform int   u_steps;
uniform bool  u_warp;

varying vec2 vUv;

// ── Noise ──────────────────────────────────────────────────────
float hash(vec3 p){
  p = fract(p * vec3(127.1, 311.7, 74.7));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*(3.0-2.0*f);
  return mix(
    mix(mix(hash(i),            hash(i+vec3(1,0,0)),u.x),
        mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),u.x),u.y),
    mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),u.x),
        mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),u.x),u.y),u.z);
}
float fbm3(vec3 p){
  float v=0.0, a=0.5;
  for(int i=0;i<3;i++){ v+=a*noise3(p); p=p*2.1+vec3(1.7,9.2,3.4); a*=0.5; }
  return v;
}

// ── Spine: off-center, slow organic twist ─────────────────────
// Offset to left-center like the reference image
// The spine wanders slowly — not a straight line
vec3 spine(float y, float t){
  // Base offset: left of center (like reference)
  float xBase = -0.15;
  return vec3(
    xBase + 0.20*sin(y*0.5 + t*0.20) + 0.10*sin(y*1.2 - t*0.15),
    y,
    0.25*sin(y*0.4 - t*0.18)
  );
}

// ── AABB ray intersection ──────────────────────────────────────
vec2 aabbIntersect(vec3 ro, vec3 rd, vec3 bMin, vec3 bMax){
  vec3 invD = 1.0 / rd;
  vec3 t0 = (bMin - ro) * invD;
  vec3 t1 = (bMax - ro) * invD;
  vec3 tMin3 = min(t0, t1);
  vec3 tMax3 = max(t0, t1);
  float tNear = max(max(tMin3.x, tMin3.y), tMin3.z);
  float tFar  = min(min(tMax3.x, tMax3.y), tMax3.z);
  return vec2(max(tNear, 0.0), tFar);
}

// ── sampleVolume ───────────────────────────────────────────────
// Returns: vec4(dens, pocket, n, mCombined)
// Also outputs d0 (core gaussian), d1 (halo gaussian)
void sampleVolume(in vec3 posIn, in float t, in bool doWarp,
                  out float dens, out float pocket, out float n,
                  out float d0, out float d1, out float mCombined){

  // Macro mask: dramatic thickness variation along filament
  float m  = noise3(vec3(0.0, posIn.y * 0.20, 0.5) + t * 0.025);
  float m2 = noise3(vec3(0.4, posIn.y * 0.50, 1.3) + t * 0.04);
  mCombined = mix(m, m2, 0.4);

  // Slow large-scale drift (whole filament breathes)
  float driftN = noise3(vec3(posIn.y * 0.35, t * 0.06, 0.8));
  vec3 pos = posIn;
  float drift = (driftN * 2.0 - 1.0) * 0.15 + (m * 2.0 - 1.0) * 0.08;
  pos.x += drift * sin(pos.y * 0.28 + t * 0.10);
  pos.z += drift * cos(pos.y * 0.22 + t * 0.08);

  // ── swirlN: single noise, reused for swirl + hot modulation ─
  float swirlN = noise3(vec3(pos.y * 0.35, t * 0.07, 0.5));

  // World-space swirl: curling smoke — tendrils peel off spine
  vec3 sp0 = spine(pos.y, t);
  vec3 q0  = pos - sp0;
  float haloMask = exp(-dot(q0, q0) * 2.0);
  float swirlAngle = (swirlN * 2.0 - 1.0) * 0.80 * haloMask;
  float swirlDist = length(q0.xz) + 0.001;
  vec2  swirlDir  = q0.xz / swirlDist;
  pos.xz += vec2(-swirlDir.y, swirlDir.x) * swirlAngle * swirlDist * 0.9;

  // Domain warp (high quality tiers only)
  vec3 posW = pos;
  if(doWarp){
    float wN = fbm3(pos * 1.0 + vec3(t*0.05, -t*0.04, t*0.035));
    posW = pos + 0.20 * vec3(
      wN,
      fbm3(pos * 1.1 + vec3(5.2, 1.3, 0.0) - t*0.035),
      wN * 0.6 + 0.12
    );
  }
  n = fbm3(posW * 1.5);
  float clump = smoothstep(0.38, 0.82, n);

  // Spine-local coords (from swirled pos)
  vec3 sp = spine(pos.y, t);
  vec3 q  = pos - sp;

  // Local twist/shear — same medium, one field
  float ang = 0.25*sin(pos.y*0.7 + t*0.25) + 0.18*(driftN*2.0-1.0);
  float ca = cos(ang), sa = sin(ang);
  q.xz = vec2(ca*q.x - sa*q.z, sa*q.x + ca*q.z);

  // Core and halo from same warped q
  float kCore = mix(12.0, 45.0, mCombined);
  d0 = exp(-dot(q,q) * kCore);
  float kHalo = 1.8;
  d1 = exp(-dot(q,q) * kHalo) * mix(0.4, 1.1, m);

  // ── shapeMask: knots and gaps along filament length ──────────
  // Two noise calls (reuse swirlN for one, one new call for gap)
  float knotN = smoothstep(0.35, 0.75, swirlN); // reuse swirlN
  float gapN  = smoothstep(0.55, 0.85, noise3(vec3(3.1, pos.y*0.45, t*0.06)));
  float shapeMask = clamp(knotN * (1.0 - 0.85*gapN), 0.0, 1.0);

  // Density: shapeMask carves true dark gaps
  dens = (d0 * 1.3 + d1 * 0.35) * (0.45 + 1.1*n) * mix(0.5, 1.8, clump) * shapeMask;

  // Amber pockets: tied to halo thickness, not global
  pocket = smoothstep(0.55, 0.90, n) * smoothstep(0.15, 0.55, d1);
}

vec3 rotY(vec3 v, float a){ float c=cos(a),s=sin(a); return vec3(c*v.x+s*v.z,v.y,-s*v.x+c*v.z); }
vec3 rotX(vec3 v, float a){ float c=cos(a),s=sin(a); return vec3(v.x,c*v.y-s*v.z,s*v.y+c*v.z); }

void main(){
  float aspect = u_resolution.x / u_resolution.y;
  float t = u_time;
  vec2 sc = (vUv * 2.0 - 1.0);
  sc.x *= aspect;

  vec3 ro = vec3(0.0, 0.0, 2.5);
  vec3 rd = normalize(vec3(sc.x, sc.y, -1.5));
  // Very slight camera drift — makes it feel alive
  rd = rotY(rd, 0.05*sin(t*0.06));
  rd = rotX(rd, 0.03*sin(t*0.045));

  // Wide AABB — tendrils can reach out
  vec3 bMin = vec3(-1.4, -3.2, -1.4);
  vec3 bMax = vec3( 1.4,  3.2,  1.4);
  vec2 tb = aabbIntersect(ro, rd, bMin, bMax);
  if(tb.y < tb.x){ gl_FragColor = vec4(0.0,0.0,0.0,1.0); return; }

  float tNear    = tb.x;
  float tFar     = min(tb.y, 5.5);
  float stepSize = (tFar - tNear) / float(u_steps);

  float T   = 1.0;
  vec3  col = vec3(0.0);

  for(int i = 0; i < 64; i++){
    if(i >= u_steps) break;
    float tm  = tNear + (float(i) + 0.5) * stepSize;
    vec3  pos = ro + rd * tm;

    float dens, pocket, n, d0, d1, mCombined;
    sampleVolume(pos, t, u_warp, dens, pocket, n, d0, d1, mCombined);

    if(dens < 0.001) continue;

    // ── shapeMask in ray loop (recompute — same seeds as sampleVolume)
    float swirlN_r = noise3(vec3(pos.y * 0.35, t * 0.07, 0.5));
    float knotN_r  = smoothstep(0.35, 0.75, swirlN_r);
    float gapN_r   = smoothstep(0.55, 0.85, noise3(vec3(3.1, pos.y*0.45, t*0.06)));
    float shapeMask = clamp(knotN_r * (1.0 - 0.85*gapN_r), 0.0, 1.0);

    // ── Beer-Lambert: amber pockets carve dark interruptions ──
    float amberMask = smoothstep(0.55, 0.90, n) * d1 * (1.0 - clamp(d0*3.0, 0.0, 1.0));
    float absorption = 6.0 + amberMask * 18.0;
    T *= exp(-dens * absorption * stepSize);

    // ── Hot highlight: white only as rare spike ───────────────
    float coreSharp = pow(d0, 2.2);
    float gapMask   = shapeMask * (1.0 - clamp(d1 * 3.0, 0.0, 1.0));
    float hot       = smoothstep(0.75, 0.98, coreSharp * gapMask);

    // ── Emission strength ─────────────────────────────────────
    float densProxy  = clamp(d0*1.0 + d1*0.5, 0.0, 1.0);
    float blueWeight = smoothstep(0.15, 0.55, densProxy) * shapeMask;
    float cyanWeight = smoothstep(0.45, 0.85, densProxy) * shapeMask;
    float whiteWeight= hot;

    vec3 deepBlue = vec3(0.03, 0.10, 0.65);
    vec3 cyan     = vec3(0.08, 0.70, 1.00);
    vec3 iceWhite = vec3(0.95, 0.97, 1.00);
    vec3 amber    = vec3(0.40, 0.20, 0.06);

    vec3 emissionColor = mix(vec3(0.0), deepBlue, blueWeight);
    emissionColor = mix(emissionColor, cyan, cyanWeight);
    emissionColor = mix(emissionColor, iceWhite, whiteWeight);
    emissionColor = mix(emissionColor, amber, amberMask * 0.8);

    // Emission strength: core bright, halo dim, pockets suppressed
    float coreEmit  = pow(d0, 1.6) * (1.2 + 1.8*(1.0 - mCombined)) * shapeMask;
    float haloEmit  = d1 * 0.18 * shapeMask;
    float emit = (coreEmit + haloEmit) * (1.0 - pocket * 0.75);

    col += T * emissionColor * emit * stepSize;

    if(T < 0.01) break;
  }

  // Punchy tone map — blacks stay black
  col = col / (col + 0.28);
  col = pow(max(col, vec3(0.0)), vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}
`

// ─── Component ─────────────────────────────────────────────────

export function GrainBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const rafRef       = useRef<number>(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let tierIdx = 1
    let tier = TIERS[tierIdx]

    const getSize = () => ({
      w: Math.round(window.innerWidth  * tier.scale),
      h: Math.round(window.innerHeight * tier.scale),
    })

    const { w, h } = getSize()

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
    renderer.setPixelRatio(1)
    renderer.setSize(w, h, false)
    renderer.domElement.style.width  = '100%'
    renderer.domElement.style.height = '100%'
    renderer.setClearColor(0x000000, 1)
    renderer.toneMapping = THREE.LinearToneMapping
    renderer.toneMappingExposure = 1.0
    container.appendChild(renderer.domElement)

    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    const scene  = new THREE.Scene()

    const uniforms = {
      u_time:       { value: 0.0 },
      u_resolution: { value: new THREE.Vector2(w, h) },
      u_steps:      { value: tier.steps },
      u_warp:       { value: tier.warp },
    }

    const material = new THREE.ShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      depthWrite: false, depthTest: false,
    })
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material))

    const composer = new EffectComposer(renderer)
    composer.addPass(new RenderPass(scene, camera))
    composer.addPass(new EffectPass(camera,
      new BloomEffect({ intensity: BLOOM_INTENSITY, luminanceThreshold: BLOOM_THRESHOLD, luminanceSmoothing: 0.6, mipmapBlur: true }),
      new VignetteEffect({ darkness: 0.35, offset: 0.5 }),
      new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0010, 0.0006), radialModulation: false, modulationOffset: 0.0 }),
    ))

    const applySize = () => {
      const { w: nw, h: nh } = getSize()
      renderer.setSize(nw, nh, false)
      composer.setSize(nw, nh)
      uniforms.u_resolution.value.set(nw, nh)
    }
    window.addEventListener('resize', applySize)

    const FPS_WINDOW   = 2000
    const DOWN_THRESH  = 38
    const UP_THRESH    = 55
    const DOWN_CONFIRM = 3
    const UP_CONFIRM   = 5

    let frameTimes: number[] = []
    let lastFpsCheck = performance.now()
    let badCount = 0, goodCount = 0

    const checkFps = (now: number) => {
      if (now - lastFpsCheck < FPS_WINDOW) return
      lastFpsCheck = now
      const recent = frameTimes.filter(t => now - t < FPS_WINDOW)
      frameTimes = recent
      const fps = recent.length / (FPS_WINDOW / 1000)
      if (fps < DOWN_THRESH) {
        goodCount = 0; badCount++
        if (badCount >= DOWN_CONFIRM && tierIdx < TIERS.length - 1) {
          tierIdx++; tier = TIERS[tierIdx]
          uniforms.u_steps.value = tier.steps
          uniforms.u_warp.value  = tier.warp
          applySize(); badCount = 0
        }
      } else if (fps > UP_THRESH) {
        badCount = 0; goodCount++
        if (goodCount >= UP_CONFIRM && tierIdx > 0) {
          tierIdx--; tier = TIERS[tierIdx]
          uniforms.u_steps.value = tier.steps
          uniforms.u_warp.value  = tier.warp
          applySize(); goodCount = 0
        }
      } else { badCount = 0; goodCount = 0 }
    }

    const clock = new THREE.Clock()
    const frameInterval = 1000 / TARGET_FPS
    let lastRender = 0

    const animate = (now: number) => {
      rafRef.current = requestAnimationFrame(animate)
      if (now - lastRender < frameInterval) return
      lastRender = now
      frameTimes.push(now)
      checkFps(now)
      uniforms.u_time.value = TIME_OFFSET + clock.getElapsedTime()
      composer.render()
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', applySize)
      composer.dispose()
      material.dispose()
      renderer.dispose()
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}
    />
  )
}
