import { Suspense, useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { BloomEffect } from "postprocessing";
import * as THREE from "three";

const IGNITION = new THREE.Color("#6442FD");
const HALO = new THREE.Color("#9999FF");

/** A tooltip card pinned to a named anchor in the GLB; dx/dy place the card relative to the anchor, in px. */
export type Tip = { anchor: "tip-nose" | "tip-cockpit" | "tip-wing" | "tip-engine"; title: string; body: string; dx: number; dy: number };

/**
 * Timeline. Scrolling past `exitAt` triggers the arrival once; from then on everything runs on time
 * (seconds since the trigger), so the ship flies in by itself and stays.
 */
const T = {
  exitAt: 0.004,    // scroll position that triggers the drop out of hyperspace (~4px)
  burst: 0.7,       // seconds: flash + local streak burst
  drift: 3.4,       // seconds: decelerating flight from the exit point to the resting spot
  turnFrom: 0.5,    // seconds: start easing from travel heading to resting angle
  tipsAt: 3.1, tipsStep: 0.28, tipsFade: 0.45, // seconds: tooltip cards stagger in after the ship settles
  // Where the exit happens: a point on screen (NDC, -1..1) and how far beyond the resting spot it is.
  // Placing it by screen position keeps it in frame whatever the stage's size or aspect.
  exitNdc: [0.5, 0.62] as const, depth: 15,
};
const REST_ROT = new THREE.Euler(0, -0.2, 0.04);
const DRAG = { yaw: 0.45, pitch: 0.2, perPx: 0.004 }; // max radians + sensitivity
const HOVER = { yaw: 0.1, pitch: 0.06 };

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Props = {
  progress: MutableRefObject<number>;
  tips: Tip[];
  tipEls: MutableRefObject<(HTMLDivElement | null)[]>;
  reducedMotion: boolean;
  compact?: boolean;
  /** GLB to fly (nose +Z, 3 units long, with tip-* anchor nodes; see design/landing/ship/process.mjs). */
  model: string;
  /** 0..1 brightness for the hull (base colour + reflections); 1 = as authored. */
  tone?: number;
  /** Set by the page when the visitor first tries to scroll; launches the ship even if the page didn't move. */
  launched?: MutableRefObject<boolean>;
};

/** Pointer state shared by the canvas handlers and the frame loop. */
type Pointer = { hx: number; hy: number; dragging: boolean; lastX: number; lastY: number; yaw: number; pitch: number };

export default function ShipScene(props: Props) {
  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 32, near: 0.1, far: 400, position: [5.5, 2.1, 7.7] }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; }}
      style={{ touchAction: "pan-y" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}

function Scene({ progress, tips, tipEls, reducedMotion, compact = false, launched, model, tone = 1 }: Props) {
  const shown = useRef(reducedMotion ? 1 : 0); // damped scroll progress
  const since = useRef(reducedMotion ? 99 : -1); // seconds since the arrival was triggered (-1 = not yet)
  const startedAt = useRef<number | null>(null);
  const bloom = useRef<BloomEffect>(null);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const pointer = useRef<Pointer>({ hx: 0, hy: 0, dragging: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0 });
  // The canvas is the ship's own stage (right panel to window edge): rest it in the middle.
  // Aim just under the ship's centre: keeps it, and the cards above and below it, inside the shorter stage.
  const target = useMemo(() => new THREE.Vector3(0, compact ? -0.2 : -0.25, 0), [compact]);
  const exitPoint = useMemo(() => new THREE.Vector3(), []);

  useLayoutEffect(() => {
    // A fixed vertical FOV shrinks the ship with the stage's height; the phone stage is short, so
    // zoom in to keep the ship about as wide on a phone as it is on desktop.
    (camera as THREE.PerspectiveCamera).zoom = compact ? THREE.MathUtils.clamp(620 / size.height, 1, 2.2) : 1;
    camera.updateProjectionMatrix();
    camera.lookAt(target);
    camera.updateMatrixWorld();
    // Exit point: beyond the resting spot, toward the top-right of the frame.
    const ray = new THREE.Vector3(T.exitNdc[0], T.exitNdc[1], 0.5).unproject(camera).sub(camera.position).normalize();
    exitPoint.copy(camera.position).addScaledVector(ray, camera.position.distanceTo(target) + T.depth);
  }, [camera, target, exitPoint, size.width, size.height, compact]);

  // Hover anywhere on the stage tilts the ship a little; mouse-drag on the canvas turns it, then it springs back.
  useEffect(() => {
    const el = gl.domElement, ptr = pointer.current;
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ptr.hx = clamp01((e.clientX - r.left) / r.width) * 2 - 1;
      ptr.hy = clamp01((e.clientY - r.top) / r.height) * 2 - 1;
      if (!ptr.dragging) return;
      ptr.yaw = THREE.MathUtils.clamp(ptr.yaw + (e.clientX - ptr.lastX) * DRAG.perPx, -DRAG.yaw, DRAG.yaw);
      ptr.pitch = THREE.MathUtils.clamp(ptr.pitch + (e.clientY - ptr.lastY) * DRAG.perPx, -DRAG.pitch, DRAG.pitch);
      ptr.lastX = e.clientX; ptr.lastY = e.clientY;
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button !== 0) return; // touch keeps scrolling the page
      ptr.dragging = true; ptr.lastX = e.clientX; ptr.lastY = e.clientY;
      el.style.cursor = "grabbing";
    };
    const up = () => { ptr.dragging = false; el.style.cursor = "grab"; };
    el.style.cursor = "grab";
    window.addEventListener("pointermove", move, { passive: true });
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    return () => { window.removeEventListener("pointermove", move); el.removeEventListener("pointerdown", down); window.removeEventListener("pointerup", up); };
  }, [gl]);

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    shown.current = reducedMotion ? 1 : THREE.MathUtils.damp(shown.current, progress.current, 5, dt);
    if (!reducedMotion) {
      if (startedAt.current === null && (launched?.current || progress.current > T.exitAt)) startedAt.current = clock.elapsedTime;
      since.current = startedAt.current === null ? -1 : clock.elapsedTime - startedAt.current;
    }
    if (bloom.current) bloom.current.intensity = 0.5 + flashOf(since.current) * 1.6;
  });

  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[3, 6, 5]} intensity={2.2} />
      <directionalLight position={[-6, 2, -6]} intensity={3} color={IGNITION} />
      <directionalLight position={[6, -1, -4]} intensity={1.6} color={HALO} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 2]} scale={[10, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={3} position={[-5, 1, -3]} scale={[6, 2, 1]} color="#6442FD" />
        <Lightformer form="rect" intensity={2} position={[5, 0, -2]} scale={[6, 2, 1]} color="#9999FF" />
      </Environment>

      <Starfield shown={shown} pointer={pointer} compact={compact} />
      <Suspense fallback={null}>
        <Ship model={model} tone={tone} since={since} exitPoint={exitPoint} pointer={pointer} tips={tips} tipEls={tipEls} />
      </Suspense>

      {!compact && (
        <EffectComposer multisampling={0}>
          <Bloom ref={bloom} mipmapBlur luminanceThreshold={0.6} luminanceSmoothing={0.2} intensity={0.5} />
        </EffectComposer>
      )}
    </>
  );
}

/** Flash curve (seconds since trigger): a sharp peak right as the ship drops out. */
const flashOf = (t: number) => (t <= 0 ? 0 : Math.max(0, 1 - Math.abs(t - 0.06) / 0.09));

/** Regular space: still stars at two sizes, a slow parallax with scroll and the pointer. */
function Starfield({ shown, pointer, compact }: { shown: MutableRefObject<number>; pointer: MutableRefObject<Pointer>; compact: boolean }) {
  const group = useRef<THREE.Group>(null);
  const layers = useMemo(() => {
    const make = (n: number, near: number, far: number) => {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
      const c = new THREE.Color();
      // A wide cone around where the camera actually looks (it views the ship at an angle), so every
      // edge of the view has stars whatever the stage's aspect, with room for drag and hover.
      const fwd = new THREE.Vector3(-5.5, -2.35, -7.7).normalize();
      const side = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(side, fwd);
      const cosMax = Math.cos(THREE.MathUtils.degToRad(55));
      const dir = new THREE.Vector3();
      for (let i = 0; i < n; i++) {
        const cos = THREE.MathUtils.lerp(cosMax, 1, Math.random()), sin = Math.sqrt(1 - cos * cos), phi = Math.random() * Math.PI * 2;
        dir.copy(fwd).multiplyScalar(cos).addScaledVector(side, sin * Math.cos(phi)).addScaledVector(up, sin * Math.sin(phi));
        dir.multiplyScalar(THREE.MathUtils.lerp(near, far, Math.random()));
        pos.set([dir.x, dir.y, dir.z], i * 3);
        c.set(Math.random() < 0.18 ? HALO : new THREE.Color(1, 1, 1)).multiplyScalar(0.35 + Math.random() * 0.65);
        col.set([c.r, c.g, c.b], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.BufferAttribute(col, 3));
      return g;
    };
    return { small: make(compact ? 1200 : 3000, 20, 160), large: make(compact ? 90 : 220, 15, 90) };
  }, [compact]);

  useFrame((_, dt) => {
    if (!group.current) return;
    const p = pointer.current;
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, -shown.current * 0.06 - p.hx * 0.012, 3, dt);
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, p.hy * 0.008, 3, dt);
  });

  return (
    <group ref={group}>
      <points geometry={layers.small}>
        <pointsMaterial size={1.3} sizeAttenuation={false} vertexColors transparent opacity={0.85} depthWrite={false} toneMapped={false} />
      </points>
      <points geometry={layers.large}>
        <pointsMaterial size={2.4} sizeAttenuation={false} vertexColors transparent opacity={0.95} depthWrite={false} toneMapped={false} />
      </points>
    </group>
  );
}

/** The local hyperspace burst: a short-lived cluster of streaks + a flash, only around the exit point. */
function ExitBurst({ since, at, dir }: { since: MutableRefObject<number>; at: THREE.Vector3; dir: THREE.Vector3 }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const flash = useRef<THREE.Sprite>(null);
  const glowMap = useMemo(() => radialTexture(), []);
  const seeds = useMemo(() => Array.from({ length: 46 }, () => {
    const a = Math.random() * Math.PI * 2, r = 0.25 + Math.random() * 1.9;
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, z: (Math.random() - 0.5) * 3, w: 0.5 + Math.random() };
  }), []);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);
  const s = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const e = since.current;
    const live = e >= 0 && e < T.burst;
    if (group.current) {
      group.current.visible = live;
      group.current.position.copy(at);
      group.current.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    }
    if (live && mesh.current) {
      const k = easeOutExpo(e / T.burst);
      const len = (1 - k) * 22;
      for (let i = 0; i < seeds.length; i++) {
        const sd = seeds[i]!;
        // Streak tails trail back along the travel direction and collapse forward into the exit point.
        v.set(sd.x, sd.y, sd.z - len * 0.5 * sd.w);
        s.set(0.02 * sd.w, 0.02 * sd.w, Math.max(0.001, len * sd.w));
        m.compose(v, q, s); mesh.current.setMatrixAt(i, m);
      }
      mesh.current.instanceMatrix.needsUpdate = true;
      if (mat.current) mat.current.opacity = 1 - k;
    }
    if (flash.current) {
      const f = flashOf(e);
      flash.current.visible = f > 0;
      const sc = 1.5 + f * 6;
      flash.current.scale.set(sc, sc, 1);
      (flash.current.material as THREE.SpriteMaterial).opacity = f;
    }
  });

  return (
    <group ref={group} visible={false}>
      <instancedMesh ref={mesh} args={[undefined, undefined, seeds.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial ref={mat} color={HALO} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <sprite ref={flash} visible={false}>
        <spriteMaterial map={glowMap} color="#ffffff" transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </sprite>
    </group>
  );
}

function Ship({ model, tone, since, exitPoint, pointer, tips, tipEls }: {
  model: string; tone: number; since: MutableRefObject<number>; exitPoint: THREE.Vector3; pointer: MutableRefObject<Pointer>;
  tips: Tip[]; tipEls: MutableRefObject<(HTMLDivElement | null)[]>;
}) {
  const { scene } = useGLTF(model);
  const group = useRef<THREE.Group>(null);    // path + heading
  const interact = useRef<THREE.Group>(null); // hover tilt + drag
  const body = useRef<THREE.Group>(null);     // model space (tooltip anchors live here)
  const glow = useRef<THREE.Sprite>(null);
  const light = useRef<THREE.PointLight>(null);

  const anchors = useMemo(() => {
    const out: Record<string, THREE.Vector3> = {};
    scene.traverse((o) => { if (o.name.startsWith("tip-")) out[o.name] = o.position.clone(); });
    // Absolute (not multiplied) so remounts never compound: the cached GLB is shared.
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh; if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setScalar(tone);
      mat.envMapIntensity = 1.1 * tone;
    });
    return out;
  }, [scene, tone]);
  const engine = anchors["tip-engine"] ?? new THREE.Vector3(0, 0.1, -1.5);
  const glowMap = useMemo(() => radialTexture(), []);

  // Travel direction (exit point -> resting point) and the matching heading for the ship's nose (+Z).
  const dir = useMemo(() => new THREE.Vector3(), []);
  const qTravel = useMemo(() => new THREE.Quaternion(), []);
  const qRest = useMemo(() => new THREE.Quaternion().setFromEuler(REST_ROT), []);
  const tmpQ = useMemo(() => new THREE.Quaternion(), []);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, camera, size }, rawDt) => {
    const dt = Math.min(rawDt, 0.05), e = since.current, t = clock.elapsedTime;
    dir.copy(exitPoint).negate().normalize();
    qTravel.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    const flight = easeOutCubic(seg(e, 0, T.drift));
    const settled = seg(e, T.drift - 0.6, T.drift);

    if (group.current) {
      group.current.visible = e >= 0;
      // Decelerating flight from the exit point to the resting spot; it arrives with a short surge.
      group.current.position.lerpVectors(exitPoint, new THREE.Vector3(0, 0, 0), flight);
      group.current.position.addScaledVector(dir, -(1 - easeOutExpo(seg(e, 0, 0.5))) * 1.6);
      group.current.position.y += Math.sin(t * 0.9) * 0.04 * settled;
      tmpQ.copy(qTravel).slerp(qRest, easeInOut(seg(e, T.turnFrom, T.drift)));
      group.current.quaternion.copy(tmpQ);
    }
    if (interact.current) {
      const ptr = pointer.current;
      if (!ptr.dragging) { ptr.yaw = THREE.MathUtils.damp(ptr.yaw, 0, 3, dt); ptr.pitch = THREE.MathUtils.damp(ptr.pitch, 0, 3, dt); }
      const yaw = ptr.yaw + ptr.hx * HOVER.yaw, pitch = ptr.pitch + ptr.hy * HOVER.pitch;
      interact.current.rotation.y = THREE.MathUtils.damp(interact.current.rotation.y, yaw, 6, dt);
      interact.current.rotation.x = THREE.MathUtils.damp(interact.current.rotation.x, pitch + Math.sin(t * 0.7) * 0.01 * settled, 6, dt);
      interact.current.rotation.z = THREE.MathUtils.damp(interact.current.rotation.z, -yaw * 0.25 + Math.sin(t * 0.6) * 0.012 * settled, 6, dt);
    }

    const heat = 1 - flight * 0.75; // engines cool as the ship slows
    if (glow.current) { const s = 0.32 + heat * 0.42 + Math.sin(t * 9) * 0.02; glow.current.scale.set(s, s, 1); (glow.current.material as THREE.SpriteMaterial).opacity = 0.3 + heat * 0.35; }
    if (light.current) light.current.intensity = 4 + heat * 12;

    // Project each anchor to screen space and move its DOM card there.
    if (!body.current) return;
    body.current.updateWorldMatrix(true, false);
    tips.forEach((tip, i) => {
      const el = tipEls.current[i]; const at = anchors[tip.anchor]; if (!el || !at) return;
      v.copy(at); body.current!.localToWorld(v); v.project(camera);
      const start = T.tipsAt + i * T.tipsStep;
      const a = v.z < 1 ? easeOutCubic(seg(e, start, start + T.tipsFade)) : 0;
      el.style.opacity = String(a);
      el.style.transform = `translate3d(${((v.x + 1) / 2) * size.width}px, ${((1 - v.y) / 2) * size.height + (1 - a) * 8}px, 0)`;
    });
  });

  return (
    <>
      <ExitBurst since={since} at={exitPoint} dir={dir} />
      <group ref={group} visible={false}>
        <group ref={interact}>
          <group ref={body}>
            <primitive object={scene} />
          </group>
          <sprite ref={glow} position={[engine.x, engine.y, engine.z - 0.12]}>
            <spriteMaterial map={glowMap} color={IGNITION} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
          <pointLight ref={light} position={[engine.x, engine.y + 0.1, engine.z - 0.4]} color={IGNITION} distance={6} decay={1.6} />
        </group>
      </group>
    </>
  );
}

function radialTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.25, "rgba(255,255,255,0.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

