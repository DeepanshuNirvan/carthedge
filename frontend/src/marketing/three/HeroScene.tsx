import { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const JADE = new THREE.Color('#0FB06C');
const GOLD = new THREE.Color('#E9B960');

/** One meaningful object: a translucent glass "order card" (the AI-drafted
 *  order) with a gold ₹ coin resting on it (money saved). Slow spin + cursor
 *  parallax so it reads as a physical object, not a PNG on a gradient. */
function OrderObject() {
  const group = useRef<THREE.Group>(null);
  const coin = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, state.pointer.x * 0.5, 0.045);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, state.pointer.y * 0.35, 0.045);
      group.current.rotation.y = Math.sin(t * 0.25) * 0.35;
    }
    if (coin.current) coin.current.rotation.z = t * 0.6;
  });

  return (
    <group ref={group}>
      <Float speed={1.3} rotationIntensity={0.3} floatIntensity={0.9}>
        {/* the glass order card */}
        <RoundedBox args={[3, 3.9, 0.18]} radius={0.18} smoothness={8} position={[0, 0, 0]}>
          <meshPhysicalMaterial
            transmission={0.92}
            thickness={1.1}
            roughness={0.16}
            metalness={0}
            ior={1.35}
            color="#0e1a16"
            emissive={JADE}
            emissiveIntensity={0.12}
            clearcoat={1}
            clearcoatRoughness={0.2}
            transparent
          />
        </RoundedBox>

        {/* field rows etched on the card */}
        {[1.35, 0.75, 0.15, -0.45, -1.05].map((y, i) => (
          <mesh key={y} position={[-0.15, y, 0.12]}>
            <boxGeometry args={[i === 0 ? 1.7 : 2.2, 0.09, 0.02]} />
            <meshStandardMaterial
              color={i === 0 ? '#0FB06C' : '#2a3a34'}
              emissive={i === 0 ? JADE : new THREE.Color('#1c2a25')}
              emissiveIntensity={i === 0 ? 0.9 : 0.3}
            />
          </mesh>
        ))}

        {/* gold ₹ coin = money saved */}
        <mesh ref={coin} position={[1.15, -1.55, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.62, 0.62, 0.14, 48]} />
          <meshStandardMaterial color={GOLD} emissive={GOLD} emissiveIntensity={0.28} roughness={0.24} metalness={0.85} />
        </mesh>
      </Float>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.6]}
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[6, 5, 6]} intensity={42} color={JADE} />
      <pointLight position={[-6, -3, 4]} intensity={26} color={GOLD} />
      <pointLight position={[0, 0, 6]} intensity={14} color="#ffffff" />
      <OrderObject />
    </Canvas>
  );
}
