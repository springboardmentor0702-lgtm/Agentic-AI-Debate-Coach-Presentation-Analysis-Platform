import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial, Sparkles, Environment } from "@react-three/drei";
import WebGLBoundary from "./WebGLBoundary";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

/**
 * The faceted glass core plus its two opposing rim lights (accent /
 * accent-2 - the platform's "two sides" of a debate) and an outer
 * wireframe shell rotating a touch faster, implying many claims
 * making up one structured argument. Gently tilts toward the
 * pointer; the tilt target is written into `pointer` by the parent
 * so this component never has to own its own event listener.
 */
function CoreScene({ pointer, accent, accent2, reduced }) {
  const group = useRef(null);
  const outer = useRef(null);
  const core = useRef(null);

  useFrame((_, delta) => {
    const speed = reduced ? 0 : delta;
    if (outer.current) outer.current.rotation.y += speed * 0.18;
    if (outer.current) outer.current.rotation.x += speed * 0.05;
    if (core.current && !reduced) core.current.rotation.y -= delta * 0.1;

    if (group.current) {
      const targetX = pointer.current.y * 0.25;
      const targetY = pointer.current.x * 0.35;
      group.current.rotation.x += (targetX - group.current.rotation.x) * 0.04;
      group.current.rotation.y += (targetY - group.current.rotation.y) * 0.04;
    }
  });

  return (
    <group ref={group}>
      <ambientLight intensity={0.4} />
      <pointLight position={[-3, 1.5, 2]} intensity={40} color={accent} />
      <pointLight position={[3, -1, 2.5]} intensity={40} color={accent2} />
      <directionalLight position={[0, 4, 5]} intensity={0.6} />

      <Float speed={reduced ? 0 : 1.4} rotationIntensity={reduced ? 0 : 0.4} floatIntensity={reduced ? 0 : 0.8}>
        <mesh ref={outer} scale={1.62}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={accent} wireframe transparent opacity={0.28} />
        </mesh>

        <mesh ref={core} scale={1.05}>
          <icosahedronGeometry args={[1, 3]} />
          <MeshTransmissionMaterial
            thickness={1.1}
            roughness={0.06}
            transmission={1}
            ior={1.15}
            chromaticAberration={0.04}
            distortion={0.15}
            distortionScale={0.3}
            temporalDistortion={reduced ? 0 : 0.1}
            clearcoat={1}
            clearcoatRoughness={0.1}
            color="#ffffff"
            backside
          />
        </mesh>
      </Float>

      <Sparkles count={40} scale={4.5} size={2} speed={reduced ? 0 : 0.3} color={accent} opacity={0.6} />
    </group>
  );
}

function Fallback() {
  // Pure-CSS stand-in for browsers/devices without usable WebGL - a
  // soft layered glow instead of the faceted core. Same footprint,
  // zero dependency on three.js.
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="w-56 h-56 rounded-full blur-2xl opacity-50"
        style={{ background: "radial-gradient(circle, var(--accent), transparent 70%)" }}
      />
      <div
        className="absolute w-40 h-40 rounded-full blur-xl opacity-40"
        style={{ background: "radial-gradient(circle, var(--accent-2), transparent 70%)" }}
      />
    </div>
  );
}

export default function ClashCore({ className = "" }) {
  const pointer = useRef({ x: 0, y: 0 });
  const reduced = useReducedMotion();

  const colors = useMemo(
    () => ({
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b80f9",
      accent2: getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim() || "#ff8a5c",
    }),
    []
  );

  const handlePointerMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    pointer.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: ((e.clientY - rect.top) / rect.height) * 2 - 1,
    };
  };

  return (
    <div className={className} onPointerMove={handlePointerMove} aria-hidden="true">
      <WebGLBoundary fallback={<Fallback />}>
        <Suspense fallback={<Fallback />}>
          <Canvas
            dpr={[1, 1.75]}
            gl={{ antialias: true, alpha: true }}
            camera={{ position: [0, 0, 5], fov: 40 }}
          >
            <CoreScene pointer={pointer} accent={colors.accent} accent2={colors.accent2} reduced={reduced} />
            <Environment preset="city" />
          </Canvas>
        </Suspense>
      </WebGLBoundary>
    </div>
  );
}
