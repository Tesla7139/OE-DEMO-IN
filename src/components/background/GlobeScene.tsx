"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const PRIMARY = "#2f5bff";

/** lat/long (degrees) -> point on a sphere of radius r */
function latLongToVec3(lat: number, lon: number, r: number) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta)
  );
}

/** Even point distribution on a sphere (fibonacci) for the dotted look */
function fibonacciSphere(n: number, r: number) {
  const positions = new Float32Array(n * 3);
  const inc = Math.PI * (3 - Math.sqrt(5));
  const offset = 2 / n;
  for (let i = 0; i < n; i++) {
    const y = i * offset - 1 + offset / 2;
    const rad = Math.sqrt(1 - y * y);
    const phi = i * inc;
    positions[i * 3] = Math.cos(phi) * rad * r;
    positions[i * 3 + 1] = y * r;
    positions[i * 3 + 2] = Math.sin(phi) * rad * r;
  }
  return positions;
}

// Endpoints for "orders saved" arcs (deterministic, no randomness).
// Domestic Indian lanes — the routes an Indian D2C brand actually ships.
const ARC_ENDPOINTS: [number, number, number, number][] = [
  [28.61, 77.2, 19.08, 72.88], // Delhi -> Mumbai
  [12.97, 77.59, 28.61, 77.2], // Bengaluru -> Delhi
  [19.08, 72.88, 22.57, 88.36], // Mumbai -> Kolkata
  [17.39, 78.49, 13.08, 80.27], // Hyderabad -> Chennai
  [18.52, 73.86, 26.91, 75.79], // Pune -> Jaipur
  [23.02, 72.57, 12.97, 77.59], // Ahmedabad -> Bengaluru
];

function buildArc(latA: number, lonA: number, latB: number, lonB: number, r: number) {
  const start = latLongToVec3(latA, lonA, r);
  const end = latLongToVec3(latB, lonB, r);
  const mid = start.clone().add(end).multiplyScalar(0.5);
  const dist = start.distanceTo(end);
  mid.normalize().multiplyScalar(r + dist * 0.45); // lift the arc off the surface
  return new THREE.QuadraticBezierCurve3(start, mid, end);
}

function Globe() {
  const group = useRef<THREE.Group>(null);
  const markers = useRef<(THREE.Mesh | null)[]>([]);

  const dotPositions = useMemo(() => fibonacciSphere(900, 1.002), []);

  const dotTexture = useMemo(() => {
    const size = 64;
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d")!;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    return new THREE.CanvasTexture(c);
  }, []);

  const arcs = useMemo(() => {
    return ARC_ENDPOINTS.map((e, i) => {
      const curve = buildArc(e[0], e[1], e[2], e[3], 1.0);
      const pts = curve.getPoints(60);
      const geom = new THREE.BufferGeometry().setFromPoints(pts);
      return { curve, geom, phase: i / ARC_ENDPOINTS.length, speed: 0.12 + (i % 3) * 0.03 };
    });
  }, []);

  const endpointDots = useMemo(() => {
    const set = new Set<string>();
    const pts: THREE.Vector3[] = [];
    ARC_ENDPOINTS.forEach((e) => {
      const a = latLongToVec3(e[0], e[1], 1.005);
      const b = latLongToVec3(e[2], e[3], 1.005);
      [a, b].forEach((v) => {
        const key = `${v.x.toFixed(2)},${v.y.toFixed(2)}`;
        if (!set.has(key)) {
          set.add(key);
          pts.push(v);
        }
      });
    });
    return pts;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      // Revolve in place — fixed position, tilt and size (never drifts or floats)
      group.current.rotation.y += delta * 0.16;
      group.current.rotation.x = 0.18;
      group.current.position.set(0, -2.1, 0); // centered, resting at the middle-bottom
      group.current.scale.setScalar(1.3);
    }
    // travelling markers along arcs
    arcs.forEach((arc, i) => {
      const m = markers.current[i];
      if (!m) return;
      const tt = (t * arc.speed + arc.phase) % 1;
      const pos = arc.curve.getPoint(tt);
      m.position.copy(pos);
      const fade = Math.sin(tt * Math.PI); // fade in/out along the path
      (m.material as THREE.MeshBasicMaterial).opacity = fade;
      m.scale.setScalar(0.6 + fade * 0.8);
    });
  });

  return (
    <group ref={group} rotation={[0.18, 0, 0]}>
      {/* faint wireframe shell */}
      <mesh>
        <sphereGeometry args={[1, 36, 36]} />
        <meshBasicMaterial color={PRIMARY} wireframe transparent opacity={0.12} />
      </mesh>

      {/* dotted surface */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[dotPositions, 3]}
            count={dotPositions.length / 3}
          />
        </bufferGeometry>
        <pointsMaterial
          map={dotTexture}
          color={PRIMARY}
          size={0.026}
          sizeAttenuation
          transparent
          opacity={0.85}
          alphaTest={0.4}
          depthWrite={false}
        />
      </points>

      {/* arcs */}
      {arcs.map((arc, i) => (
        <primitive
          key={i}
          object={
            new THREE.Line(
              arc.geom,
              new THREE.LineBasicMaterial({ color: PRIMARY, transparent: true, opacity: 0.6 })
            )
          }
        />
      ))}

      {/* travelling markers */}
      {arcs.map((_, i) => (
        <mesh key={`m${i}`} ref={(el) => (markers.current[i] = el)}>
          <sphereGeometry args={[0.018, 12, 12]} />
          <meshBasicMaterial color={PRIMARY} transparent />
        </mesh>
      ))}

      {/* endpoint pulse dots */}
      {endpointDots.map((v, i) => (
        <mesh key={`e${i}`} position={v}>
          <sphereGeometry args={[0.012, 10, 10]} />
          <meshBasicMaterial color={PRIMARY} transparent opacity={0.9} />
        </mesh>
      ))}
    </group>
  );
}

export default function GlobeScene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 3.1], fov: 45 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
      style={{ width: "100%", height: "100%", background: "transparent" }}
    >
      <Globe />
    </Canvas>
  );
}
