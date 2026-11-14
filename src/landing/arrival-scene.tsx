import { Suspense, useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer, useGLTF } from "@react-three/drei";
import * as THREE from "three";

/*
 * The footer band's ship in 3D (arrival.tsx): the hero's model seen from straight above, nose to the right.
 * An orthographic camera makes one world unit one CSS pixel of the band, so the ship can follow the DOM:
 * every frame it reads where the arrival animation (.hj-arrive, landing.css) has got to, its offset and
 * speed-stretch, so the streaks, flash and trail stay in step with it. It banks while braking, then drifts.
 */

export type ArrivalEls = { box: HTMLDivElement | null; anchor: HTMLDivElement | null; arrive: HTMLDivElement | null };

const IGNITION = new THREE.Color("#6442FD");
const HALO = new THREE.Color("#9999FF");
/** The processed models are 3 units long, nose along +Z. */
const MODEL_LEN = 3;

type Props = { model: string; tone?: number; size: number; els: MutableRefObject<ArrivalEls>; active: boolean };

export default function ArrivalScene(props: Props) {
  return (
    <Canvas
      orthographic
      frameloop={props.active ? "always" : "never"}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 400, 0], zoom: 1, near: 1, far: 1000 }}
      onCreated={({ gl, camera }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05;
        camera.up.set(0, 0, -1); // screen up is -Z, so +X is screen right and the band's y runs along +Z
        camera.lookAt(0, 0, 0);
      }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[120, 400, -160]} intensity={2.4} />
      <directionalLight position={[-300, 120, 200]} intensity={2.2} color={IGNITION} />
      <directionalLight position={[300, 60, 220]} intensity={1.2} color={HALO} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 5, -2]} scale={[10, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={3} position={[-5, 1, 3]} scale={[6, 2, 1]} color="#6442FD" />
        <Lightformer form="rect" intensity={2} position={[5, 0, 2]} scale={[6, 2, 1]} color="#9999FF" />
      </Environment>
      <Suspense fallback={null}>
        <Ship {...props} />
      </Suspense>
    </Canvas>
  );
}

function Ship({ model, tone = 1, size, els }: Props) {
  const { scene: shared } = useGLTF(model);
  // the hero mounts the cached scene; an object can only have one parent, so this gets a copy
  const scene = useMemo(() => {
    const s = shared.clone(true);
    s.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; const mat = m.material as THREE.MeshStandardMaterial; mat.color.setScalar(tone); mat.envMapIntensity = 1.1 * tone; });
    return s;
  }, [shared, tone]);
  const place = useRef<THREE.Group>(null);
  const bank = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const last = useRef({ tx: Number.NaN });

  useFrame(({ size: canvas, clock }, rawDt) => {
    const { box, anchor, arrive } = els.current;
    if (!box || !anchor || !arrive || !place.current || !bank.current || !body.current) return;
    const dt = Math.min(rawDt, 0.05), t = clock.elapsedTime;
    const k = canvas.width / (box.offsetWidth || 1); // canvas px per band px (the desktop page is zoomed)
    const cs = getComputedStyle(arrive);
    const m = cs.transform && cs.transform !== "none" ? new DOMMatrixReadOnly(cs.transform) : null;
    const tx = m ? m.m41 : 0, sx = m ? m.a : 1;
    place.current.visible = parseFloat(cs.opacity) > 0.02;

    const settled = Math.abs(tx) < 0.5 && Math.abs(sx - 1) < 0.005;
    const drift = settled ? Math.sin(t * 1.25) * 2 : 0;
    place.current.position.set((anchor.offsetLeft + tx - box.offsetWidth / 2) * k, 0, (anchor.offsetTop + drift - box.offsetHeight / 2) * k);
    place.current.scale.set(sx, 1, 1); // speed-stretch along the flight line
    body.current.scale.setScalar(((size * 0.9) / MODEL_LEN) * k);

    // bank into the braking, level out once parked (with the faintest sway)
    const v = Number.isNaN(last.current.tx) ? 0 : (tx - last.current.tx) / Math.max(rawDt, 1e-3);
    last.current.tx = tx;
    const roll = THREE.MathUtils.clamp(-v / 4000, -0.35, 0.35) + (settled ? Math.sin(t * 0.7) * 0.03 : 0);
    bank.current.rotation.x = THREE.MathUtils.damp(bank.current.rotation.x, roll, 6, dt);
  });

  return (
    <group ref={place}>
      <group ref={bank}>
        {/* nose (+Z) to +X: screen right */}
        <group ref={body} rotation={[0, Math.PI / 2, 0]}>
          <primitive object={scene} />
        </group>
      </group>
    </group>
  );
}
