"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface HeroOrbProps {
  dark: boolean;
  active: boolean;
  /** Called once when the measured frame rate is too low to stay premium. */
  onDegrade: () => void;
}

const palette = {
  dark: { core: "#4a1a5e", mid: "#c070b4", rim: "#f4c3a8", ring: "#e8b4a0", card: ["#ff9f8a", "#d070c4", "#ffd47a"] },
  light: { core: "#6e2468", mid: "#d98aa0", rim: "#f6d9c2", ring: "#a85a69", card: ["#b76e79", "#8e4a56", "#9a7326"] }
} as const;

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying float vD;

  vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
  float snoise(vec3 v){
    const vec2 C=vec2(1.0/6.0,1.0/3.0);
    const vec4 D=vec4(0.0,0.5,1.0,2.0);
    vec3 i=floor(v+dot(v,C.yyy));
    vec3 x0=v-i+dot(i,C.xxx);
    vec3 g=step(x0.yzx,x0.xyz);
    vec3 l=1.0-g;
    vec3 i1=min(g.xyz,l.zxy);
    vec3 i2=max(g.xyz,l.zxy);
    vec3 x1=x0-i1+C.xxx;
    vec3 x2=x0-i2+C.yyy;
    vec3 x3=x0-D.yyy;
    i=mod289(i);
    vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
    float n_=0.142857142857;
    vec3 ns=n_*D.wyz-D.xzx;
    vec4 j=p-49.0*floor(p*ns.z*ns.z);
    vec4 x_=floor(j*ns.z);
    vec4 y_=floor(j-7.0*x_);
    vec4 x=x_*ns.x+ns.yyyy;
    vec4 y=y_*ns.x+ns.yyyy;
    vec4 h=1.0-abs(x)-abs(y);
    vec4 b0=vec4(x.xy,y.xy);
    vec4 b1=vec4(x.zw,y.zw);
    vec4 s0=floor(b0)*2.0+1.0;
    vec4 s1=floor(b1)*2.0+1.0;
    vec4 sh=-step(h,vec4(0.0));
    vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
    vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
    vec3 p0=vec3(a0.xy,h.x);
    vec3 p1=vec3(a0.zw,h.y);
    vec3 p2=vec3(a1.xy,h.z);
    vec3 p3=vec3(a1.zw,h.w);
    vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
    vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
    m=m*m;
    return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main(){
    float d = snoise(normal*0.85 + vec3(0.0, uTime*0.14, uTime*0.1));
    vec3 pos = position + normal * d * 0.075;
    vD = d;
    vN = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uCore;
  uniform vec3 uMid;
  uniform vec3 uRim;
  uniform float uTime;
  varying vec3 vN;
  varying vec3 vV;
  varying float vD;

  void main(){
    vec3 n = normalize(vN);
    vec3 v = normalize(vV);
    vec3 L = normalize(vec3(-0.5, 0.7, 0.8));
    float fres = pow(1.0 - max(dot(n, v), 0.0), 2.3);
    float lit = dot(n, L) * 0.5 + 0.5;
    vec3 col = mix(uCore, uMid, smoothstep(0.05, 0.85, lit + vD * 0.22));
    col = mix(col, uRim, fres * 0.85);
    float t = vD * 4.0 + uTime * 0.3;
    col += 0.03 * vec3(sin(t), sin(t + 2.1), sin(t + 4.2));
    float spec = pow(max(dot(reflect(-L, n), v), 0.0), 42.0);
    col += spec * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }
`;

const CARD_COUNT = 20;

/** Small deterministic PRNG (mulberry32): keeps the sparkle field stable and render-pure. */
function seededRandom(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundedRect(w: number, h: number, r: number) {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s);
}

function Scene({ dark, onDegrade }: { dark: boolean; onDegrade: () => void }) {
  const colors = dark ? palette.dark : palette.light;
  const group = useRef<THREE.Group>(null);
  const ringA = useRef<THREE.Mesh>(null);
  const ringB = useRef<THREE.Mesh>(null);
  const points = useRef<THREE.Points>(null);
  const cards = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);
  // Stable constructor args: r3f builds the material once; later updates go through the ref.
  const [shaderArgs] = useState((): [THREE.ShaderMaterialParameters] => [
    {
      uniforms: {
        uTime: { value: 0 },
        uCore: { value: new THREE.Color(palette.dark.core) },
        uMid: { value: new THREE.Color(palette.dark.mid) },
        uRim: { value: new THREE.Color(palette.dark.rim) }
      },
      vertexShader,
      fragmentShader
    }
  ]);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const cardGeometry = useMemo(() => roundedRect(0.34, 0.6, 0.06), []);
  const sparkles = useMemo(() => {
    const positions = new Float32Array(260 * 3);
    const random = seededRandom(7);
    for (let i = 0; i < 260; i += 1) {
      const radius = 3.4 + random() * 3.2;
      const theta = random() * Math.PI * 2;
      const phi = Math.acos(2 * random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, []);
  const slow = useRef({ frames: 0, total: 0, reported: false });

  useEffect(() => {
    const shader = material.current;
    if (shader) {
      shader.uniforms.uCore.value.set(colors.core);
      shader.uniforms.uMid.value.set(colors.mid);
      shader.uniforms.uRim.value.set(colors.rim);
    }
    const mesh = cards.current;
    if (mesh) {
      colors.card.forEach((hex, index) => {
        for (let i = index; i < CARD_COUNT; i += 3) mesh.setColorAt(i, new THREE.Color(hex));
      });
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      // instanceColor is created lazily; the material must recompile once to pick it up.
      (mesh.material as THREE.Material).needsUpdate = true;
    }
  }, [colors]);

  useEffect(() => {
    return () => {
      cardGeometry.dispose();
      sparkles.dispose();
    };
  }, [cardGeometry, sparkles]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (material.current) material.current.uniforms.uTime.value = t;

    // Adaptive quality guard: bail out to the CSS orb if we cannot hold ~35fps.
    const s = slow.current;
    if (!s.reported && t > 1.5) {
      s.frames += 1;
      s.total += delta;
      if (s.frames >= 90) {
        if (s.total / s.frames > 0.028) {
          s.reported = true;
          onDegrade();
        } else {
          s.frames = 0;
          s.total = 0;
        }
      }
    }

    if (group.current) {
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, state.pointer.x * 0.35, 3, delta);
      group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, -state.pointer.y * 0.22, 3, delta);
    }
    if (ringA.current) ringA.current.rotation.z = t * 0.12;
    if (ringB.current) ringB.current.rotation.z = -t * 0.08;
    if (points.current) points.current.rotation.y = t * 0.02;

    const mesh = cards.current;
    if (mesh) {
      for (let i = 0; i < CARD_COUNT; i += 1) {
        const phase = (t * 0.07 + i / CARD_COUNT) % 1;
        const angle = (i / CARD_COUNT) * Math.PI * 4 + t * 0.1;
        const radius = 2.9 + Math.sin(i * 1.7) * 0.3;
        const y = (phase - 0.5) * 6.4;
        const fade = Math.min(1, Math.sin(phase * Math.PI) * 2.4);
        dummy.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
        dummy.rotation.set(0, -angle + Math.PI / 2, 0.08 * Math.sin(t + i));
        dummy.scale.setScalar(Math.max(0.0001, fade));
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <icosahedronGeometry args={[1.45, 28]} />
        <shaderMaterial ref={material} args={shaderArgs} />
      </mesh>
      <mesh ref={ringA} rotation={[Math.PI / 2.4, 0.2, 0]}>
        <torusGeometry args={[2.05, 0.011, 8, 160]} />
        <meshBasicMaterial color={colors.ring} transparent opacity={0.75} />
      </mesh>
      <mesh ref={ringB} rotation={[Math.PI / 1.9, -0.5, 0]}>
        <torusGeometry args={[2.3, 0.008, 8, 160]} />
        <meshBasicMaterial color={colors.ring} transparent opacity={0.4} />
      </mesh>
      <instancedMesh ref={cards} args={[cardGeometry, undefined, CARD_COUNT]} frustumCulled={false}>
        <meshBasicMaterial transparent opacity={0.78} side={THREE.DoubleSide} depthWrite={false} />
      </instancedMesh>
      <points ref={points} geometry={sparkles}>
        <pointsMaterial color={colors.card[2]} size={0.035} sizeAttenuation transparent opacity={0.7} depthWrite={false} />
      </points>
    </group>
  );
}

export default function HeroOrb({ dark, active, onDegrade }: HeroOrbProps) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      frameloop={active ? "always" : "never"}
      camera={{ position: [0, 0, 7.2], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <Scene dark={dark} onDegrade={onDegrade} />
    </Canvas>
  );
}
