import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, MeshTransmissionMaterial } from "@react-three/drei";
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

function Shard({ position, rotation, scale, color, reduced }) {
  const ref = useRef(null);
  useFrame((_, delta) => {
    if (ref.current && !reduced) {
      ref.current.rotation.x += delta * 0.06;
      ref.current.rotation.y += delta * 0.09;
    }
  });
  return (
    <Float speed={reduced ? 0 : 1} rotationIntensity={0} floatIntensity={reduced ? 0 : 1.2}>
      <mesh ref={ref} position={position} rotation={rotation} scale={scale}>
        <octahedronGeometry args={[1, 0]} />
        <MeshTransmissionMaterial
          thickness={0.6}
          roughness={0.15}
          transmission={1}
          ior={1.2}
          chromaticAberration={0.02}
          color={color}
        />
      </mesh>
    </Float>
  );
}

function Scene({ reduced, accent, accent2 }) {
  // Fixed, deliberately-placed positions (not random-per-render) so
  // the composition is stable across reloads and doesn't jump around
  // whenever the component remounts.
  const shards = useMemo(
    () => [
      { position: [-2.6, 1.2, -1], rotation: [0.4, 0.2, 0], scale: 0.55, color: accent },
      { position: [2.4, -1, -2], rotation: [0.1, 0.6, 0.2], scale: 0.75, color: accent2 },
      { position: [1.8, 1.8, -1.5], rotation: [0.5, 0.1, 0.3], scale: 0.4, color: accent },
      { position: [-2.2, -1.6, -1], rotation: [0.2, 0.4, 0.1], scale: 0.45, color: accent2 },
      { position: [0, 2.4, -2.5], rotation: [0.3, 0.3, 0], scale: 0.35, color: accent },
    ],
    [accent, accent2]
  );

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[-4, 2, 3]} intensity={30} color={accent} />
      <pointLight position={[4, -2, 3]} intensity={30} color={accent2} />
      {shards.map((s, i) => (
        <Shard key={i} {...s} reduced={reduced} />
      ))}
    </>
  );
}

export default function ShardField({ className = "" }) {
  const reduced = useReducedMotion();
  const colors = useMemo(
    () => ({
      accent: getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#8b80f9",
      accent2: getComputedStyle(document.documentElement).getPropertyValue("--accent-2").trim() || "#ff8a5c",
    }),
    []
  );

  return (
    <div className={className} aria-hidden="true">
      <WebGLBoundary fallback={null}>
        <Suspense fallback={null}>
          <Canvas dpr={[1, 1.5]} gl={{ antialias: true, alpha: true }} camera={{ position: [0, 0, 6], fov: 45 }}>
            <Scene reduced={reduced} accent={colors.accent} accent2={colors.accent2} />
          </Canvas>
        </Suspense>
      </WebGLBoundary>
    </div>
  );
}
