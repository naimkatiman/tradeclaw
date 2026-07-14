'use client';

/**
 * CostFieldScene — every resolved sized trade as one point in a WebGL field.
 *
 * Y is the trade's R-multiple. The scene eases between two truthful states:
 * gross R (before cost) and net R (gross minus the trade's modeled
 * round-trip fees and slippage). The visual argument IS the finding: applying cost drags
 * the cloud through the zero plane. Data comes from /api/research/cost-field;
 * nothing here is invented, only clamped for display (±DISPLAY_R_CLAMP on Y).
 *
 * Budget per DESIGN.md: vanilla three, DPR ≤ 2, one instanced Points draw,
 * RAF paused when offscreen or tab-hidden, full dispose on unmount.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import type { CostFieldData } from './static-cost-field';

export type CostFieldMode = 'auto' | 'gross' | 'net';

interface CostFieldSceneProps {
  data: CostFieldData;
  mode: CostFieldMode;
  /** Reports the state currently shown (auto mode cycles), for the toggle UI. */
  onPhaseChange?: (phase: 'gross' | 'net') => void;
}

/** Display-only clamp so a 19R outlier doesn't flatten the composition. */
const DISPLAY_R_CLAMP = 4.5;
const FIELD_WIDTH = 30;
const LANE_SPACING = 4;
/** Auto cycle: hold gross, sink to net, hold, rise back. */
const AUTO_PERIOD_S = 12;

const UP_COLOR = new THREE.Color('#10b981');
const DOWN_COLOR = new THREE.Color('#f43f5e');

/** Deterministic per-index jitter in [-1, 1] — stable across mounts. */
function jitter(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return (x - Math.floor(x)) * 2 - 1;
}

const VERTEX_SHADER = /* glsl */ `
  attribute float grossY;
  attribute float netY;
  attribute float seed;
  uniform float uMix;
  uniform float uTime;
  uniform float uPixelRatio;
  varying float vY;
  void main() {
    vec3 p = position;
    float y = mix(grossY, netY, uMix);
    y += sin(uTime * 0.6 + seed * 6.2831) * 0.03;
    p.y = y;
    vY = y;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = clamp((uPixelRatio * 46.0) / -mv.z, 1.5, 7.0 * uPixelRatio);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;
  uniform vec3 uUp;
  uniform vec3 uDown;
  varying float vY;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    float a = smoothstep(0.5, 0.1, d) * 0.85;
    if (a < 0.02) discard;
    vec3 col = mix(uDown, uUp, smoothstep(-0.12, 0.12, vY));
    gl_FragColor = vec4(col, a);
  }
`;

export function CostFieldScene({ data, mode, onPhaseChange }: CostFieldSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modeRef = useRef<CostFieldMode>(mode);
  const phaseRef = useRef<'gross' | 'net'>('gross');
  const onPhaseChangeRef = useRef(onPhaseChange);

  // Keep the latest mode / callback readable from the long-lived RAF loop
  // without re-running the scene effect. Written after commit, never during
  // render (refs must not be mutated in the render body).
  useEffect(() => {
    modeRef.current = mode;
    onPhaseChangeRef.current = onPhaseChange;
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || data.t.length === 0) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return; // wrapper's WebGL probe should prevent this; fail silent if not
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 120);

    const n = data.t.length;
    const positions = new Float32Array(n * 3);
    const grossY = new Float32Array(n);
    const netY = new Float32Array(n);
    const seeds = new Float32Array(n);
    const clampR = (r: number) =>
      Math.max(-DISPLAY_R_CLAMP, Math.min(DISPLAY_R_CLAMP, r));

    for (let i = 0; i < n; i++) {
      const x = (n === 1 ? 0.5 : i / (n - 1)) * FIELD_WIDTH - FIELD_WIDTH / 2;
      const lane = (data.cls[i] - 1) * LANE_SPACING;
      positions[i * 3] = x;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = lane + jitter(i) * 1.6;
      grossY[i] = clampR(data.grossR[i]);
      netY[i] = clampR(data.grossR[i] - data.costR[i]);
      seeds[i] = (jitter(i * 7 + 3) + 1) / 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('grossY', new THREE.BufferAttribute(grossY, 1));
    geometry.setAttribute('netY', new THREE.BufferAttribute(netY, 1));
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uMix: { value: 0 },
        uTime: { value: 0 },
        uPixelRatio: { value: dpr },
        uUp: { value: UP_COLOR },
        uDown: { value: DOWN_COLOR },
      },
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const grid = new THREE.GridHelper(FIELD_WIDTH + 6, 22, 0x9ca3af, 0x9ca3af);
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.14;
    gridMaterial.depthWrite = false;
    scene.add(grid);

    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    let raf = 0;
    let running = false;
    let inView = true;
    let mix = 0;
    let lastTs: number | null = null;
    const clock = new THREE.Clock();

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const elapsed = clock.getElapsedTime();
      const dt = lastTs == null ? 0.016 : Math.min(0.1, elapsed - lastTs);
      lastTs = elapsed;

      const m = modeRef.current;
      const target =
        m === 'gross'
          ? 0
          : m === 'net'
            ? 1
            : (elapsed % AUTO_PERIOD_S) < AUTO_PERIOD_S / 2
              ? 0
              : 1;
      mix += (target - mix) * (1 - Math.exp(-dt * 2.4));
      material.uniforms.uMix.value = mix;
      material.uniforms.uTime.value = elapsed;

      const phase: 'gross' | 'net' = target === 1 ? 'net' : 'gross';
      if (phase !== phaseRef.current) {
        phaseRef.current = phase;
        onPhaseChangeRef.current?.(phase);
      }

      const sway = Math.sin(elapsed * 0.09) * 0.4;
      camera.position.set(Math.sin(sway) * 14.5, 3.4 + Math.sin(elapsed * 0.05) * 0.4, Math.cos(sway) * 14.5);
      camera.lookAt(0, -0.4, 0);

      renderer.render(scene, camera);
    };

    const start = () => {
      if (running || !inView || document.hidden) return;
      running = true;
      lastTs = null;
      clock.start();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      if (!running) return;
      running = false;
      clock.stop();
      cancelAnimationFrame(raf);
    };

    const intersection = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0.05 },
    );
    intersection.observe(container);

    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener('visibilitychange', onVisibility);

    start();

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      intersection.disconnect();
      resizeObserver.disconnect();
      geometry.dispose();
      material.dispose();
      gridMaterial.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, [data]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      role="img"
      aria-label={`3D field of ${data.t.length} resolved trades. Each dot shows one trade result before and after modeled fees and slippage, relative to a zero-result plane.`}
    />
  );
}
