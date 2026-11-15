import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { KeyboardControls, useKeyboardControls, Stars } from '@react-three/drei';
import * as THREE from 'three';

export const KEYMAP = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'back', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
  { name: 'act', keys: ['KeyE', 'Space'] },
];

/* deterministic rng */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const CRATERS = (() => {
  const r = rng(42);
  const list = [
    { x: -30, z: 20, r: 9, d: 2.2 },
    { x: 35, z: 12, r: 12, d: 2.8 },
    { x: 14, z: -32, r: 7, d: 1.6 },
    { x: -40, z: -30, r: 14, d: 3.2 },
  ];
  for (let i = 0; i < 46; i++) {
    const x = (r() - 0.5) * 150;
    const z = (r() - 0.5) * 150;
    if (Math.hypot(x, z) < 14) continue;
    list.push({ x, z, r: 1 + r() * 4.5, d: 0.3 + r() * 0.9 });
  }
  return list;
})();

export function heightAt(x, z) {
  let h = Math.sin(x * 0.05) * Math.cos(z * 0.045) * 1.1 + Math.sin(x * 0.17 + z * 0.11) * 0.25 + Math.cos(z * 0.21 - x * 0.07) * 0.18;
  for (const c of CRATERS) {
    const d = Math.hypot(x - c.x, z - c.z) / c.r;
    if (d < 1) h -= c.d * (1 - d * d);
    else if (d < 1.5) h += c.d * 0.35 * Math.sin(((d - 1) / 0.5) * Math.PI);
  }
  // flatten base pad
  const base = Math.hypot(x, z * 0.9);
  const k = THREE.MathUtils.smoothstep(base, 10, 26);
  return h * (0.15 + 0.85 * k);
}

function Terrain({ onGround }) {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(180, 180, 220, 220);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = [];
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const n = Math.sin(x * 1.7) * Math.cos(z * 1.3) * 0.04 + Math.sin(x * 0.4 + z * 0.9) * 0.03;
      const l = 0.42 + h * 0.05 + n;
      c.setHSL(0.09, 0.06, THREE.MathUtils.clamp(l, 0.2, 0.62));
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  return (
    <mesh geometry={geo} receiveShadow onPointerDown={(e) => { e.stopPropagation(); onGround?.(e.point); }}>
      <meshStandardMaterial vertexColors roughness={0.97} metalness={0} flatShading />
    </mesh>
  );
}

function Rocks() {
  const rocks = useMemo(() => {
    const r = rng(7);
    const out = [];
    for (let i = 0; i < 140; i++) {
      const x = (r() - 0.5) * 140, z = (r() - 0.5) * 140;
      if (Math.hypot(x, z) < 12) continue;
      const s = 0.15 + Math.pow(r(), 3) * 1.6;
      out.push({ x, z, s, ry: r() * 6, sx: 0.7 + r() * 0.8, sy: 0.5 + r() * 0.5, d: r() > 0.5 ? 0 : 1 });
    }
    return out;
  }, []);
  return rocks.map((k, i) => (
    <mesh key={i} castShadow receiveShadow position={[k.x, heightAt(k.x, k.z) + k.s * 0.2, k.z]} rotation={[0.3, k.ry, 0.2]} scale={[k.s * k.sx, k.s * k.sy, k.s]}>
      <dodecahedronGeometry args={[1, k.d]} />
      <meshStandardMaterial color="#8f877c" roughness={1} flatShading />
    </mesh>
  ));
}

function Earth() {
  const ref = useRef();
  useFrame((_, d) => { if (ref.current) ref.current.rotation.y += d * 0.02; });
  return (
    <group position={[-120, 70, -220]}>
      <mesh ref={ref}>
        <sphereGeometry args={[14, 48, 48]} />
        <meshStandardMaterial color="#2f6fa8" emissive="#0d2b4a" emissiveIntensity={0.6} roughness={0.6} />
      </mesh>
      <mesh rotation={[0.4, 0.8, 0]}>
        <sphereGeometry args={[14.25, 32, 32]} />
        <meshStandardMaterial color="#e9eef2" transparent opacity={0.35} roughness={1} />
      </mesh>
      <mesh>
        <sphereGeometry args={[15.2, 32, 32]} />
        <meshBasicMaterial color="#6fb4ff" transparent opacity={0.08} side={THREE.BackSide} />
      </mesh>
    </group>
  );
}

const M = {
  shell: '#d9d3c7', dark: '#2a2f3a', amber: '#e8a33d', teal: '#3cc4bd', glass: '#7fd6ff', red: '#d8473a',
};

function Placed({ x, z, children, rot = 0 }) {
  return <group position={[x, heightAt(x, z), z]} rotation={[0, rot, 0]}>{children}</group>;
}

function Beacon({ on, color = M.amber, y = 3 }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.material.emissiveIntensity = on ? 1.5 + Math.sin(clock.elapsedTime * 3) * 1.2 : 0.1;
  });
  return (
    <mesh ref={ref} position={[0, y, 0]}>
      <sphereGeometry args={[0.14, 12, 12]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1} />
    </mesh>
  );
}

function Habitat({ on }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 1.4, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[1.6, 1.6, 6, 24]} />
        <meshStandardMaterial color={M.shell} roughness={0.6} metalness={0.2} />
      </mesh>
      {[-3, 3].map((x) => (
        <mesh key={x} castShadow position={[x, 1.4, 0]}>
          <sphereGeometry args={[1.6, 24, 16, 0, Math.PI * 2, 0, Math.PI]} />
          <meshStandardMaterial color={M.shell} roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
      {[-2, 0, 2].map((x) => (
        <mesh key={x} position={[x, 1.4, 0]} rotation={[0, 0, Math.PI / 2]}>
          <torusGeometry args={[1.62, 0.07, 8, 32]} />
          <meshStandardMaterial color={M.dark} />
        </mesh>
      ))}
      <mesh position={[0, 1.8, 1.55]}>
        <boxGeometry args={[3.6, 0.35, 0.1]} />
        <meshStandardMaterial color={on ? M.amber : '#3a3a3a'} emissive={on ? M.amber : '#000'} emissiveIntensity={on ? 1.4 : 0} />
      </mesh>
      {/* lab module */}
      <mesh castShadow receiveShadow position={[0, 1.2, -3.4]}>
        <cylinderGeometry args={[1.8, 2, 2.4, 8]} />
        <meshStandardMaterial color="#c7c0b2" roughness={0.7} metalness={0.25} />
      </mesh>
      <mesh castShadow position={[0, 2.8, -3.4]}>
        <sphereGeometry args={[1.5, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={M.glass} transparent opacity={0.55} roughness={0.1} metalness={0.5} />
      </mesh>
      <mesh castShadow position={[2.2, 3.4, -3]}>
        <cylinderGeometry args={[0.03, 0.03, 2.6]} />
        <meshStandardMaterial color={M.dark} />
      </mesh>
      <mesh position={[2.2, 4.6, -3]} rotation={[0.6, 0, 0.4]}>
        <coneGeometry args={[0.6, 0.3, 16, 1, true]} />
        <meshStandardMaterial color={M.shell} side={THREE.DoubleSide} />
      </mesh>
      <Beacon on={on} y={3.1} />
    </group>
  );
}

function OxygenPlant({ on }) {
  return (
    <group>
      {[-0.9, 0.9].map((x) => (
        <mesh key={x} castShadow position={[x, 1.2, 0]}>
          <capsuleGeometry args={[0.6, 1.2, 8, 16]} />
          <meshStandardMaterial color={on ? '#bfe9e6' : M.shell} metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
      <mesh castShadow position={[0, 0.5, 0]}>
        <boxGeometry args={[3, 0.8, 1.6]} />
        <meshStandardMaterial color={M.dark} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0.81]}>
        <planeGeometry args={[2.4, 0.3]} />
        <meshStandardMaterial color={M.teal} emissive={M.teal} emissiveIntensity={on ? 1.4 : 0.05} />
      </mesh>
      <Beacon on={on} color={M.teal} y={2.6} />
    </group>
  );
}

function SolarArray({ on }) {
  const ref = useRef();
  useFrame((_, d) => {
    if (ref.current) ref.current.rotation.x = THREE.MathUtils.lerp(ref.current.rotation.x, on ? -0.55 : -1.3, d * 1.2);
  });
  return (
    <group>
      {[-3, 0, 3].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh castShadow position={[0, 1, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 2]} />
            <meshStandardMaterial color="#9a958c" metalness={0.6} />
          </mesh>
          <group position={[0, 2, 0]} ref={x === 0 ? ref : undefined} rotation={[-0.55, 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[2.6, 0.05, 1.8]} />
              <meshStandardMaterial color="#1c2b4a" metalness={0.8} roughness={0.25} emissive="#16305c" emissiveIntensity={on ? 0.5 : 0} />
            </mesh>
          </group>
          {x !== 0 && (
            <mesh castShadow position={[0, 2, 0]} rotation={[on ? -0.55 : -1.3, 0, 0]}>
              <boxGeometry args={[2.6, 0.05, 1.8]} />
              <meshStandardMaterial color="#1c2b4a" metalness={0.8} roughness={0.25} emissive="#16305c" emissiveIntensity={on ? 0.5 : 0} />
            </mesh>
          )}
        </group>
      ))}
      <Beacon on={on} y={3.2} />
    </group>
  );
}

function IceDrill({ on }) {
  const ref = useRef();
  useFrame((_, d) => { if (ref.current && on) ref.current.rotation.y += d * 4; });
  return (
    <group>
      <mesh castShadow position={[0, 2, 0]}>
        <coneGeometry args={[1.4, 4, 4, 1, true]} />
        <meshStandardMaterial color="#b5ab98" wireframe />
      </mesh>
      <mesh ref={ref} castShadow position={[0, 1.4, 0]}>
        <cylinderGeometry args={[0.18, 0.05, 2.8, 8]} />
        <meshStandardMaterial color={M.amber} metalness={0.7} />
      </mesh>
      <mesh position={[1.6, 0.4, 0.4]} castShadow>
        <boxGeometry args={[1.2, 0.8, 1]} />
        <meshStandardMaterial color={M.shell} />
      </mesh>
      {[...Array(5)].map((_, i) => (
        <mesh key={i} position={[-1.2 + i * 0.3, 0.15, 1.3 - (i % 2) * 0.3]}>
          <icosahedronGeometry args={[0.18, 0]} />
          <meshStandardMaterial color="#cfeffa" emissive="#7fd6ff" emissiveIntensity={on ? 0.6 : 0.1} transparent opacity={0.85} />
        </mesh>
      ))}
      <Beacon on={on} color={M.glass} y={4.2} />
    </group>
  );
}

function SurveyMast({ on }) {
  const dish = useRef();
  useFrame((_, d) => { if (dish.current) dish.current.rotation.y += d * (on ? 0.8 : 0.1); });
  return (
    <group>
      <mesh castShadow position={[0, 2, 0]}>
        <cylinderGeometry args={[0.08, 0.15, 4]} />
        <meshStandardMaterial color="#a19c92" metalness={0.6} />
      </mesh>
      <group ref={dish} position={[0, 4, 0]}>
        <mesh rotation={[-0.9, 0, 0]} castShadow>
          <sphereGeometry args={[0.9, 20, 10, 0, Math.PI * 2, 0, 0.9]} />
          <meshStandardMaterial color={M.shell} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.6, 2.8, 48]} />
        <meshBasicMaterial color={M.amber} transparent opacity={on ? 0.8 : 0.3} />
      </mesh>
      <Beacon on={!on} y={4.9} />
    </group>
  );
}

function Shelter({ inside }) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0, 0]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[2.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#6d675e" roughness={1} flatShading />
      </mesh>
      <mesh position={[0, 0.6, 2]} castShadow>
        <boxGeometry args={[1.1, 1.2, 0.8]} />
        <meshStandardMaterial color={M.dark} />
      </mesh>
      <mesh position={[0, 0.7, 2.41]}>
        <planeGeometry args={[0.7, 0.9]} />
        <meshStandardMaterial color={inside ? M.amber : '#222'} emissive={inside ? M.amber : '#000'} emissiveIntensity={1.2} />
      </mesh>
    </group>
  );
}

function RepairMast({ on, locked }) {
  return (
    <group>
      <mesh castShadow position={[0, 1.6, 0]} rotation={[0, 0, on ? 0 : 0.35]}>
        <boxGeometry args={[0.3, 3.2, 0.3]} />
        <meshStandardMaterial color="#9a958c" metalness={0.5} />
      </mesh>
      <mesh castShadow position={[0, 0.4, 0]}>
        <boxGeometry args={[1.4, 0.8, 1.4]} />
        <meshStandardMaterial color={M.dark} />
      </mesh>
      <Beacon on color={on ? M.teal : locked ? '#555' : M.red} y={on ? 3.4 : 3.1} />
    </group>
  );
}

function Astronaut({ walking }) {
  const legL = useRef(), legR = useRef(), body = useRef();
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 7;
    const a = walking.current ? Math.sin(t) * 0.55 : 0;
    if (legL.current) legL.current.rotation.x = a;
    if (legR.current) legR.current.rotation.x = -a;
    if (body.current) body.current.position.y = walking.current ? Math.abs(Math.sin(t)) * 0.12 : 0;
  });
  return (
    <group ref={body}>
      <mesh castShadow position={[0, 1.15, 0]}>
        <capsuleGeometry args={[0.32, 0.5, 6, 12]} />
        <meshStandardMaterial color="#ece6da" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 1.2, -0.34]}>
        <boxGeometry args={[0.5, 0.6, 0.25]} />
        <meshStandardMaterial color="#c9c2b4" />
      </mesh>
      <mesh castShadow position={[0, 1.78, 0]}>
        <sphereGeometry args={[0.27, 20, 16]} />
        <meshStandardMaterial color="#ece6da" />
      </mesh>
      <mesh position={[0, 1.8, 0.14]}>
        <sphereGeometry args={[0.2, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
        <meshStandardMaterial color={M.amber} metalness={1} roughness={0.1} />
      </mesh>
      {[legL, legR].map((r, i) => (
        <group key={i} ref={r} position={[i ? 0.14 : -0.14, 0.75, 0]}>
          <mesh castShadow position={[0, -0.35, 0]}>
            <capsuleGeometry args={[0.11, 0.45, 4, 8]} />
            <meshStandardMaterial color="#ddd6c8" />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.2, 0.33]}>
        <boxGeometry args={[0.18, 0.06, 0.02]} />
        <meshStandardMaterial color={M.teal} emissive={M.teal} emissiveIntensity={1.5} />
      </mesh>
    </group>
  );
}

function Rover({ driving }) {
  return (
    <group>
      <mesh castShadow position={[0, 0.8, 0]}>
        <boxGeometry args={[1.8, 0.35, 2.8]} />
        <meshStandardMaterial color="#d9d3c7" metalness={0.3} roughness={0.6} />
      </mesh>
      <mesh castShadow position={[0, 1.3, -0.3]}>
        <boxGeometry args={[1.5, 0.6, 1.2]} />
        <meshStandardMaterial color={M.glass} transparent opacity={0.4} metalness={0.6} roughness={0.1} />
      </mesh>
      {[-1, 1].flatMap((sx) => [-1, 0, 1].map((sz) => (
        <mesh key={`${sx}${sz}`} castShadow position={[sx * 1.0, 0.42, sz * 1.0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.38, 0.38, 0.25, 14]} />
          <meshStandardMaterial color="#2a2a2e" roughness={0.9} />
        </mesh>
      )))}
      <mesh position={[0, 0.85, 1.42]}>
        <boxGeometry args={[1.2, 0.1, 0.02]} />
        <meshStandardMaterial color={M.amber} emissive={M.amber} emissiveIntensity={driving ? 2 : 0.3} />
      </mesh>
      <mesh position={[0.6, 1.9, -1.1]}>
        <cylinderGeometry args={[0.02, 0.02, 1.2]} />
        <meshStandardMaterial color="#888" />
      </mesh>
    </group>
  );
}

function Dust({ active }) {
  const ref = useRef();
  const geo = useMemo(() => {
    const r = rng(99);
    const arr = new Float32Array(1600 * 3);
    for (let i = 0; i < 1600; i++) {
      arr[i * 3] = (r() - 0.5) * 90; arr[i * 3 + 1] = r() * 14; arr[i * 3 + 2] = (r() - 0.5) * 90;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  useFrame((_, d) => {
    if (!ref.current) return;
    ref.current.material.opacity = THREE.MathUtils.lerp(ref.current.material.opacity, active ? 0.7 : 0, d * 1.5);
    ref.current.position.x = (ref.current.position.x + d * 14) % 30;
    ref.current.rotation.y += d * 0.02;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial color="#e8c48f" size={0.18} transparent opacity={0} depthWrite={false} />
    </points>
  );
}

function Marker({ targetRef, color }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = targetRef.current;
    ref.current.visible = !!t;
    if (!t) return;
    ref.current.position.set(t.x, heightAt(t.x, t.z) + 0.06, t.z);
    const s = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.12;
    ref.current.scale.set(s, 1, s);
  });
  return (
    <group ref={ref}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.5, 1.7, 48]} />
        <meshBasicMaterial color={color} transparent opacity={0.85} />
      </mesh>
    </group>
  );
}

function Scene({ game, mode, onMove, onGroundTarget, targetRef, touchRef }) {
  const [, getKeys] = useKeyboardControls();
  const { camera } = useThree();
  const playerRef = useRef();
  const roverRef = useRef();
  const walking = useRef(false);
  const local = useRef({ x: 0, z: 8, yaw: 0 });
  const roverPark = useRef({ x: 6, z: 7, yaw: 0.6 });
  const acc = useRef({ dx: 0, dz: 0, t: 0 });
  const sun = useRef();
  const p = game?.player || { x: 0, z: 8 };
  const playing = mode === 'play';
  const suppressedKeys = useRef(new Set());
  useEffect(() => {
    // Require a release after any hold: reading must not leave held WASD active.
    const keys = getKeys();
    for (const name of ['forward', 'back', 'left', 'right']) {
      if (keys[name]) suppressedKeys.current.add(name);
    }
    if (!playing) {
      acc.current = { dx: 0, dz: 0, t: 0 };
      local.current.x = p.x; local.current.z = p.z;
    }
  }, [playing, getKeys]);

  useEffect(() => {
    if (!game) return;
    const L = local.current;
    if (Math.hypot(L.x - p.x, L.z - p.z) > 3) { L.x = p.x; L.z = p.z; }
  }, [p.x, p.z, game]);

  useFrame((state, dt) => {
    dt = Math.min(dt, 0.05);
    const L = local.current;
    const riding = !!game?.rover;
    let mx = 0, mz = 0;
    if (playing && !game?.sheltered) {
      const k = getKeys();
      const allowed = name => {
        if (!k[name]) suppressedKeys.current.delete(name);
        return k[name] && !suppressedKeys.current.has(name);
      };
      const t = touchRef.current;
      mx = (allowed('right') ? 1 : 0) - (allowed('left') ? 1 : 0) + t.x;
      mz = (allowed('back') ? 1 : 0) - (allowed('forward') ? 1 : 0) + t.z;
      if (mx || mz) targetRef.current = null;
      else if (targetRef.current) {
        const dx = targetRef.current.x - L.x, dz = targetRef.current.z - L.z;
        const d = Math.hypot(dx, dz);
        if (d < 0.4) targetRef.current = null;
        else { mx = dx / d; mz = dz / d; }
      }
    }
    const len = Math.hypot(mx, mz);
    walking.current = len > 0.01;
    if (len > 0) {
      const sp = (riding ? 9 : 4.6) * dt;
      const vx = (mx / Math.max(len, 1)) * sp, vz = (mz / Math.max(len, 1)) * sp;
      L.x += vx; L.z += vz;
      L.yaw = Math.atan2(mx, mz);
      acc.current.dx += vx; acc.current.dz += vz;
    }
    acc.current.t += dt;
    if (acc.current.t > 0.12 && (acc.current.dx || acc.current.dz)) {
      onMove({ x: L.x, z: L.z });
      acc.current = { dx: 0, dz: 0, t: 0 };
    }
    // reconcile with authoritative state (clamps)
    if (game && !walking.current) { L.x += (p.x - L.x) * Math.min(1, dt * 6); L.z += (p.z - L.z) * Math.min(1, dt * 6); }

    const y = heightAt(L.x, L.z);
    if (playerRef.current) {
      playerRef.current.position.set(L.x, y, L.z);
      playerRef.current.rotation.y = THREE.MathUtils.lerp(playerRef.current.rotation.y, L.yaw, dt * 10);
      playerRef.current.visible = !riding && !game?.sheltered && mode !== 'menu';
    }
    if (riding) { roverPark.current = { x: L.x, z: L.z, yaw: L.yaw }; }
    else if (game?.roverPosition) { roverPark.current = { ...game.roverPosition, yaw: roverPark.current.yaw }; }
    else if (!game) { roverPark.current = { x: 6, z: 7, yaw: 0.6 }; }
    if (roverRef.current) {
      const R = roverPark.current;
      roverRef.current.position.set(R.x, heightAt(R.x, R.z), R.z);
      roverRef.current.rotation.y = THREE.MathUtils.lerp(roverRef.current.rotation.y, R.yaw, dt * 6);
    }

    if (mode === 'menu') {
      const t = state.clock.elapsedTime * 0.05;
      camera.position.set(Math.sin(t) * 30, 9 + Math.sin(t * 2) * 1.5, Math.cos(t) * 30);
      camera.lookAt(0, 2, 0);
    } else {
      const dist = riding ? 17 : 12;
      const target = new THREE.Vector3(L.x + 2, y + dist * 0.85, L.z + dist);
      camera.position.lerp(target, Math.min(1, dt * 3));
      camera.lookAt(L.x, y + 1, L.z - 1);
    }
    if (sun.current) {
      sun.current.position.set(L.x + 40, 26, L.z + 18);
      sun.current.target.position.set(L.x, 0, L.z);
      sun.current.target.updateMatrixWorld();
    }
  });

  const S = game?.systems || {};
  const storm = game?.storm?.phase === 'active';
  const sh = game?.sheltered;
  const near = (game && game.__nearId) || null;

  return (
    <>
      <color attach="background" args={[storm ? '#1a120b' : '#05070d']} />
      <fog attach="fog" args={[storm ? '#3a2a1a' : '#05070d', storm ? 20 : 60, storm ? 70 : 170]} />
      <ambientLight intensity={0.12} color="#9fb4d8" />
      <hemisphereLight args={['#5a6b8a', '#2a241c', 0.25]} />
      <directionalLight
        ref={sun} castShadow intensity={storm ? 1.4 : 3.2} color="#fff1dc"
        shadow-mapSize={[2048, 2048]} shadow-camera-left={-40} shadow-camera-right={40}
        shadow-camera-top={40} shadow-camera-bottom={-40} shadow-camera-far={120} shadow-bias={-0.0005}
      />
      <Stars radius={260} depth={60} count={4500} factor={5} saturation={0} fade speed={0.3} />
      <Earth />
      <Terrain onGround={(pt) => { if (playing) { targetRef.current = { x: pt.x, z: pt.z }; onGroundTarget?.(pt); } }} />
      <Rocks />
      <Dust active={storm} />

      <Placed x={0} z={0}><Habitat on={S.habitat} /></Placed>
      <Placed x={-8} z={-3} rot={0.4}><OxygenPlant on={S.oxygen} /></Placed>
      <Placed x={9} z={-7} rot={-0.2}><SolarArray on={S.solar} /></Placed>
      <Placed x={-17} z={-15}><IceDrill on={S.ice} /></Placed>
      <Placed x={25} z={-22}><SurveyMast on={S.survey} /></Placed>
      <Placed x={-4} z={5} rot={0.3}><Shelter inside={sh} /></Placed>
      <Placed x={11} z={1}><RepairMast on={S.repaired} locked={game?.storm?.phase !== 'passed'} /></Placed>
      {/* cables */}
      {[[-8, -3], [9, -7], [11, 1]].map(([x, z], i) => {
        const len = Math.hypot(x, z);
        return (
          <mesh key={i} position={[x / 2, 0.08, z / 2]} rotation={[0, Math.atan2(x, z), 0]}>
            <boxGeometry args={[0.06, 0.06, len]} />
            <meshStandardMaterial color="#2a2f3a" />
          </mesh>
        );
      })}

      <group ref={roverRef}><Rover driving={!!game?.rover} /></group>
      <group ref={playerRef}><Astronaut walking={walking} /></group>
      {game && <Marker targetRef={targetRef} color="#e8a33d" />}
      {near && null}
    </>
  );
}

export default function World(props) {
  return (
    <KeyboardControls map={KEYMAP}>
      <Canvas shadows dpr={[1, 1.75]} camera={{ fov: 50, position: [0, 14, 22], near: 0.1, far: 600 }} gl={{ antialias: true }}>
        <Scene {...props} />
      </Canvas>
    </KeyboardControls>
  );
}
