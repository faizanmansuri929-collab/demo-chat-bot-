'use client';

import React, { useEffect, useRef } from 'react';

export default function HeroOrb3D() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let renderer: any = null;
    let animId: number = 0;
    let isDisposed = false;

    const canvas = canvasRef.current;
    const fallback = fallbackRef.current;

    const showFallback = () => {
      if (canvas) canvas.style.display = 'none';
      if (fallback) {
        fallback.classList.remove('hidden');
        fallback.classList.add('flex');
      }
    };

    const loadThree = () => {
      if ((window as any).THREE) return Promise.resolve((window as any).THREE);
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
        script.async = true;
        script.onload = () => resolve((window as any).THREE);
        script.onerror = () => reject(new Error('Failed to load Three.js'));
        document.head.appendChild(script);
      });
    };

    loadThree()
      .then((THREE: any) => {
        if (isDisposed || !canvas) return;

        try {
          const mobile = window.matchMedia('(max-width: 768px)').matches;
          renderer = new THREE.WebGLRenderer({
            canvas,
            alpha: true,
            antialias: !mobile,
            powerPreference: mobile ? 'low-power' : 'high-performance',
          });
          renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));

          const scene = new THREE.Scene();
          const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
          camera.position.set(0, 0, 6.4);

          const parallax = new THREE.Group();
          scene.add(parallax);
          const spin = new THREE.Group();
          parallax.add(spin);

          const core = new THREE.Mesh(
            new THREE.IcosahedronGeometry(1.05, 1),
            new THREE.MeshBasicMaterial({ color: 0x2563eb, wireframe: true, transparent: true, opacity: 0.42 })
          );
          spin.add(core);

          const halo = new THREE.Mesh(
            new THREE.IcosahedronGeometry(0.68, 2),
            new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.08 })
          );
          spin.add(halo);

          const nucleus = new THREE.Mesh(
            new THREE.SphereGeometry(0.16, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x14b8a6 })
          );
          spin.add(nucleus);

          const NODE_COUNT = mobile ? 20 : 40;
          const nodePalette = [0x3b82f6, 0x14b8a6, 0x8b5cf6];
          const nodePos: any[] = [];

          for (let i = 0; i < NODE_COUNT; i++) {
            const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
            if (v.lengthSq() < 1e-4) v.set(1, 0, 0);
            v.normalize().multiplyScalar(1.65 + Math.random() * 0.8);
            nodePos.push(v);
            const m = new THREE.Mesh(
              new THREE.SphereGeometry(0.032, 8, 8),
              new THREE.MeshBasicMaterial({ color: nodePalette[i % 3] })
            );
            m.position.copy(v);
            spin.add(m);
          }

          const pts: any[] = [];
          for (let i = 0; i < NODE_COUNT; i++) {
            for (let j = i + 1; j < NODE_COUNT; j++) {
              if (nodePos[i].distanceTo(nodePos[j]) < 1.15) {
                pts.push(nodePos[i], nodePos[j]);
              }
            }
          }
          spin.add(
            new THREE.LineSegments(
              new THREE.BufferGeometry().setFromPoints(pts),
              new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.2 })
            )
          );

          const COUNT = mobile ? 240 : 820;
          const pos = new Float32Array(COUNT * 3);
          const col = new Float32Array(COUNT * 3);
          const palette = [
            [0.23, 0.51, 0.96],
            [0.08, 0.72, 0.65],
            [0.55, 0.36, 0.93],
            [0.22, 0.73, 0.97],
          ];

          for (let i = 0; i < COUNT; i++) {
            const v = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1)
              .normalize()
              .multiplyScalar(2.3 + Math.random() * 2.5);
            pos.set([v.x, v.y, v.z], i * 3);
            const c = palette[(Math.random() * palette.length) | 0];
            const j = 0.75 + Math.random() * 0.25;
            col.set([c[0] * j, c[1] * j, c[2] * j], i * 3);
          }

          const pg = new THREE.BufferGeometry();
          pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
          pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
          const particles = new THREE.Points(
            pg,
            new THREE.PointsMaterial({
              size: 0.045,
              vertexColors: true,
              transparent: true,
              opacity: 0.75,
              sizeAttenuation: true,
              depthWrite: false,
            })
          );
          parallax.add(particles);

          const resize = () => {
            if (!canvas || !canvas.parentElement) return;
            const w = canvas.clientWidth || canvas.parentElement.clientWidth;
            const h = canvas.clientHeight || canvas.parentElement.clientHeight;
            if (!w || !h) return;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
          };
          resize();
          window.addEventListener('resize', resize);

          let tx = 0;
          let ty = 0;
          const onPointerMove = (e: MouseEvent) => {
            const r = canvas.getBoundingClientRect();
            tx = (e.clientX - r.left) / r.width - 0.5;
            ty = (e.clientY - r.top) / r.height - 0.5;
          };
          window.addEventListener('mousemove', onPointerMove);

          const clock = new THREE.Clock();
          const tick = () => {
            if (isDisposed) return;
            const t = clock.getElapsedTime();
            spin.rotation.y += 0.0022;
            particles.rotation.y -= 0.0007;
            parallax.rotation.y += (tx * 0.5 - parallax.rotation.y) * 0.045;
            parallax.rotation.x += (ty * 0.32 - parallax.rotation.x) * 0.045;
            nucleus.scale.setScalar(1 + Math.sin(t * 2.1) * 0.16);
            core.material.opacity = 0.36 + Math.sin(t * 1.5) * 0.1;

            renderer.render(scene, camera);
            animId = requestAnimationFrame(tick);
          };
          animId = requestAnimationFrame(tick);
        } catch (err) {
          console.warn('Hero 3D render error, falling back:', err);
          showFallback();
        }
      })
      .catch(() => {
        showFallback();
      });

    return () => {
      isDisposed = true;
      if (animId) cancelAnimationFrame(animId);
      if (renderer && renderer.dispose) renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[320px] sm:h-[400px] lg:h-[460px] flex items-center justify-center">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div ref={fallbackRef} className="hidden absolute inset-0 items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="css-orb pulse-ring"></div>
          <div className="css-orbit">
            <span className="css-dot"></span>
          </div>
          <div className="css-orbit o2">
            <span className="css-dot d2"></span>
          </div>
          <div className="css-orbit o3">
            <span className="css-dot d3"></span>
          </div>
        </div>
      </div>

      {/* Floating Panel: Chat */}
      <div className="float-panel absolute top-[5%] left-[2%] w-48 sm:w-52 z-10 text-left">
        <div className="flex items-center gap-1.5 mb-1.5">
          <div className="w-5 h-5 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-[10px]">
            🤖
          </div>
          <span className="text-[10px] font-bold">Assistant</span>
          <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
        <div className="text-[10px] t2 leading-snug">
          Here are the B.Tech fee details — tuition, hostel and payment plan.
        </div>
        <div className="mt-1.5 flex gap-1 flex-wrap">
          <span className="source-chip text-[9px]">
            🔗 your-site/fees
          </span>
        </div>
      </div>

      {/* Floating Panel: Voice */}
      <div className="float-panel absolute bottom-[10%] left-[4%] hidden sm:flex items-center gap-2 z-10">
        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center text-white shadow-md">
          🎙️
        </div>
        <div>
          <div className="text-[10px] font-bold">Listening…</div>
          <div className="wave !h-3 on mt-0.5">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
      </div>

      {/* Floating Panel: Stats */}
      <div className="float-panel absolute top-[8%] right-[2%] hidden md:block w-40 z-10 text-left">
        <div className="text-[10px] font-bold t3 uppercase tracking-wide">Conversations</div>
        <div className="flex items-end gap-1 h-7 mt-1">
          <span className="w-2.5 rounded-t bg-blue-300" style={{ height: '35%' }}></span>
          <span className="w-2.5 rounded-t bg-blue-400" style={{ height: '55%' }}></span>
          <span className="w-2.5 rounded-t bg-teal-400" style={{ height: '45%' }}></span>
          <span className="w-2.5 rounded-t bg-blue-500" style={{ height: '75%' }}></span>
          <span className="w-2.5 rounded-t bg-teal-500" style={{ height: '60%' }}></span>
          <span className="w-2.5 rounded-t bg-blue-600" style={{ height: '90%' }}></span>
        </div>
        <span className="badge badge-emerald mt-1.5 text-[9px]">
          📈 Leads captured
        </span>
      </div>

      {/* Floating Panel: Lead */}
      <div className="float-panel absolute bottom-[8%] right-[4%] hidden lg:flex items-center gap-2.5 z-10 text-left">
        <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-[11px] font-extrabold shadow-sm">
          RS
        </div>
        <div>
          <div className="text-[11px] font-bold leading-none">Rahul S.</div>
          <div className="text-[10px] t3 mt-1">Interested in B.Tech CSE</div>
          <span className="badge badge-emerald mt-1 text-[9px]">Score 92 · Qualified</span>
        </div>
      </div>
    </div>
  );
}
