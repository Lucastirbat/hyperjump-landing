import { Suspense, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/*
 * The pit's ship: the hero's 3D model seen from above (nose to the right), with each station's line ending
 * on the part of the ship it looks after. Anchors come from the model's own tip-* nodes, so the lines land
 * on the right spot whichever ship the visitor got. Drag to turn it; it springs back. Lines are drawn in the
 * page (SVG) and updated every frame from here.
 */

const IGNITION = new THREE.Color("#6442FD");
const HALO = new THREE.Color("#9999FF");
const DRAG = { yaw: 0.6, pitch: 0.45, perPx: 0.005 };

/** Which point on the ship each station points at. Wings are resolved on screen: upper → fundraising, lower → legal. */
export type PitPart = "cockpit" | "nose" | "engine" | "wing-upper" | "wing-lower" | "hull";
export type PitLine = { side: "left" | "right"; part: PitPart };
export type PitLineEls = { lines: (SVGPolylineElement | null)[]; dots: (SVGCircleElement | null)[]; rings: (SVGCircleElement | null)[]; starts: { x: number; y: number }[] };

type Props = {
  model: string;
  tone?: number;
  stations: PitLine[];
  els: MutableRefObject<PitLineEls>;
  /** The pit's size in page px (lines are placed in that space, whatever zoom the page is under). */
  width: number;
  height: number;
  active: boolean;
};

export default function PitScene(props: Props) {
  return (
    <Canvas
      frameloop={props.active ? "always" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ fov: 30, near: 0.1, far: 100, position: [0, 6.7, 2.4] }}
      onCreated={({ gl, camera }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; camera.lookAt(0, 0, 0); }}
      style={{ touchAction: "pan-y" }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 8, 4]} intensity={2.4} />
      <directionalLight position={[-6, 2, -6]} intensity={2.6} color={IGNITION} />
      <directionalLight position={[6, -1, -4]} intensity={1.4} color={HALO} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, 2]} scale={[10, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={3} position={[-5, 1, -3]} scale={[6, 2, 1]} color="#6442FD" />
        <Lightformer form="rect" intensity={2} position={[5, 0, -2]} scale={[6, 2, 1]} color="#9999FF" />
      </Environment>
      <Suspense fallback={null}>
        <Ship {...props} />
      </Suspense>
    </Canvas>
  );
}

function Ship({ model, tone = 1, stations, els, width, height }: Props) {
  const { scene: shared } = useGLTF(model);
  // The hero mounts the cached scene; a THREE object can only have one parent, so the pit gets a copy
  // (geometry and materials stay shared).
  const scene = useMemo(() => shared.clone(true), [shared]);
  const gl = useThree((s) => s.gl);
  const turn = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const ptr = useRef({ dragging: false, lastX: 0, lastY: 0, yaw: 0, pitch: 0, hx: 0, hy: 0 });

  const parts = useMemo(() => {
    const a: Record<string, THREE.Vector3> = {};
    scene.traverse((o) => { if (o.name.startsWith("tip-")) a[o.name] = o.position.clone(); });
    scene.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mat = m.material as THREE.MeshStandardMaterial; mat.color.setScalar(tone); mat.envMapIntensity = 1.1 * tone; });
    const nose = a["tip-nose"] ?? new THREE.Vector3(0, 0, 1.5);
    const cockpit = a["tip-cockpit"] ?? new THREE.Vector3(0, 0.2, 0.4);
    const engine = a["tip-engine"] ?? new THREE.Vector3(0, 0.1, -1.5);
    const wing = a["tip-wing"] ?? new THREE.Vector3(1, 0, -0.5);
    return { nose, cockpit, engine, wingA: wing, wingB: wing.clone().setX(-wing.x), hull: cockpit.clone().lerp(engine, 0.45).setX(0) };
  }, [scene, tone]);

  // drag to turn (mouse only; touch keeps scrolling the page), hover tilts a little
  useEffect(() => {
    const el = gl.domElement, p = ptr.current;
    // hover: only while the pointer is over the pit
    const hover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      p.hx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
      p.hy = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1));
    };
    // drag: keeps working if the pointer leaves the pit mid-drag
    const drag = (e: PointerEvent) => {
      if (!p.dragging) return;
      p.yaw = THREE.MathUtils.clamp(p.yaw + (e.clientX - p.lastX) * DRAG.perPx, -DRAG.yaw, DRAG.yaw);
      p.pitch = THREE.MathUtils.clamp(p.pitch + (e.clientY - p.lastY) * DRAG.perPx, -DRAG.pitch, DRAG.pitch);
      p.lastX = e.clientX; p.lastY = e.clientY;
    };
    const down = (e: PointerEvent) => { if (e.pointerType !== "mouse" || e.button !== 0) return; p.dragging = true; p.lastX = e.clientX; p.lastY = e.clientY; };
    const up = () => { p.dragging = false; };
    const leave = () => { p.hx = 0; p.hy = 0; };
    el.addEventListener("pointermove", hover);
    el.addEventListener("pointerleave", leave);
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", drag, { passive: true });
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointermove", hover); el.removeEventListener("pointerleave", leave); el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", drag); window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  const v = useMemo(() => new THREE.Vector3(), []);
  const toScreen = (local: THREE.Vector3, camera: THREE.Camera) => {
    v.copy(local); body.current!.localToWorld(v); v.project(camera);
    return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height };
  };

  useFrame(({ clock, camera }, rawDt) => {
    const dt = Math.min(rawDt, 0.05), t = clock.elapsedTime, p = ptr.current;
    if (!p.dragging) { p.yaw = THREE.MathUtils.damp(p.yaw, 0, 2.5, dt); p.pitch = THREE.MathUtils.damp(p.pitch, 0, 2.5, dt); }
    if (turn.current) {
      // nose (+Z) to the right of the screen, then the visitor's drag / hover on top
      turn.current.rotation.y = THREE.MathUtils.damp(turn.current.rotation.y, Math.PI / 2 + p.yaw + p.hx * 0.08, 6, dt);
      turn.current.rotation.x = THREE.MathUtils.damp(turn.current.rotation.x, p.pitch + p.hy * 0.06, 6, dt);
      turn.current.rotation.z = THREE.MathUtils.damp(turn.current.rotation.z, Math.sin(t * 0.6) * 0.03, 4, dt);
      turn.current.position.y = Math.sin(t * 0.9) * 0.05;
    }
    if (!body.current) return;
    body.current.updateWorldMatrix(true, false);
    const wa = toScreen(parts.wingA, camera), wb = toScreen(parts.wingB, camera);
    const [upper, lower] = wa.y <= wb.y ? [wa, wb] : [wb, wa];
    const at: Record<PitPart, { x: number; y: number }> = {
      cockpit: toScreen(parts.cockpit, camera), nose: toScreen(parts.nose, camera), engine: toScreen(parts.engine, camera),
      hull: toScreen(parts.hull, camera), "wing-upper": upper, "wing-lower": lower,
    };
    const e = els.current;
    stations.forEach((s, i) => {
      const start = e.starts[i]; const end = at[s.part]; if (!start) return;
      const elbow = start.x + (s.side === "left" ? 40 : -40);
      e.lines[i]?.setAttribute("points", `${start.x},${start.y} ${elbow},${start.y} ${end.x.toFixed(1)},${end.y.toFixed(1)}`);
      for (const c of [e.dots[i], e.rings[i]]) { c?.setAttribute("cx", end.x.toFixed(1)); c?.setAttribute("cy", end.y.toFixed(1)); }
    });
  });

  return (
    <group ref={turn}>
      <group ref={body}>
        <primitive object={scene} />
      </group>
    </group>
  );
}
