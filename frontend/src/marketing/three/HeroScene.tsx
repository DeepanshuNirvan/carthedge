import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';

const JADE = new THREE.Color('#0FA968');
const GOLD = new THREE.Color('#E8B559');

function Particles({ count = 900 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const [positions, colors] = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 4 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 7;
      pos.set([Math.cos(theta) * r, y, Math.sin(theta) * r - 2], i * 3);
      const c = Math.random() > 0.75 ? GOLD : JADE;
      col.set([c.r, c.g, c.b], i * 3);
    }
    return [pos, col];
  }, [count]);

  useFrame((state) => {
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.03;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} vertexColors transparent opacity={0.65} sizeAttenuation depthWrite={false} />
    </points>
  );
}

/** DM bubble morphing into an order card: two panels cross-rotating in a float group. */
function BubbleToCard() {
  const group = useRef<THREE.Group>(null);
  const bubble = useRef<THREE.Mesh>(null);
  const card = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // 8s morph cycle: bubble ↔ card
    const phase = (Math.sin(t * 0.45) + 1) / 2;
    if (bubble.current && card.current) {
      (bubble.current.material as THREE.MeshStandardMaterial).opacity = 0.9 - phase * 0.75;
      (card.current.material as THREE.MeshStandardMaterial).opacity = 0.15 + phase * 0.8;
      bubble.current.rotation.y = phase * 0.9;
      card.current.rotation.y = -0.5 + phase * 0.5;
      bubble.current.scale.setScalar(1 - phase * 0.18);
      card.current.scale.setScalar(0.86 + phase * 0.14);
    }
    if (group.current) {
      group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, state.pointer.x * 0.35, 0.04);
      group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, state.pointer.y * 0.25, 0.04);
    }
  });

  return (
    <group ref={group}>
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.9}>
        {/* chat bubble */}
        <mesh ref={bubble} position={[0, 0.1, 0]}>
          <capsuleGeometry args={[0.9, 1.6, 8, 20]} />
          <meshStandardMaterial
            color="#16161C"
            emissive={JADE}
            emissiveIntensity={0.35}
            roughness={0.25}
            metalness={0.5}
            transparent
          />
        </mesh>
        {/* order card */}
        <RoundedBox ref={card} args={[2.6, 3.4, 0.16]} radius={0.16} smoothness={6} position={[0.1, 0, 0.3]}>
          <meshStandardMaterial
            color="#101015"
            emissive={GOLD}
            emissiveIntensity={0.16}
            roughness={0.2}
            metalness={0.65}
            transparent
          />
        </RoundedBox>
        {/* "field rows" on the card */}
        {[0.95, 0.35, -0.25, -0.85].map((y, i) => (
          <mesh key={y} position={[0.1, y, 0.42]}>
            <boxGeometry args={[i === 0 ? 1.7 : 2, 0.16, 0.02]} />
            <meshStandardMaterial
              color={i === 0 ? '#0FA968' : '#2A2A34'}
              emissive={i === 0 ? JADE : new THREE.Color('#2A2A34')}
              emissiveIntensity={i === 0 ? 0.8 : 0.2}
            />
          </mesh>
        ))}
      </Float>
    </group>
  );
}

export default function HeroScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7], fov: 42 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 4, 6]} intensity={40} color={JADE} />
      <pointLight position={[-6, -3, 4]} intensity={26} color={GOLD} />
      <BubbleToCard />
      <Particles />
      <fog attach="fog" args={['#0B0B0E', 9, 18]} />
    </Canvas>
  );
}
