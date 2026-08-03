"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function RotatingLiquidObject() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    camera.position.z = 5.5;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 3D Geometry: Detailed Icosahedron for smooth fluid displacement
    const geometry = new THREE.IcosahedronGeometry(1.6, 64);

    // Store initial vertex positions for noise displacement
    const positionAttribute = geometry.attributes.position;
    const initialPositions = new Float32Array(positionAttribute.array);

    // Material: Iridescent Glass / Metallic Liquid
    const material = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#4a148c"),
      emissive: new THREE.Color("#1a0033"),
      emissiveIntensity: 0.2,
      roughness: 0.12,
      metalness: 0.75,
      transmission: 0.4,
      ior: 1.45,
      reflectivity: 0.9,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      wireframe: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Lighting Setup
    const ambientLight = new THREE.AmbientLight(0x220e38, 2.5);
    scene.add(ambientLight);

    // Purple / Magenta / Cyan Point Lights around the sculpture
    const light1 = new THREE.PointLight(0xa855f7, 8, 20);
    light1.position.set(4, 4, 4);
    scene.add(light1);

    const light2 = new THREE.PointLight(0xec4899, 6, 20);
    light2.position.set(-4, -2, 3);
    scene.add(light2);

    const light3 = new THREE.PointLight(0x3b82f6, 5, 20);
    light3.position.set(0, -4, -2);
    scene.add(light3);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(2, 5, 3);
    scene.add(dirLight);

    // Simple 3D Noise generator for liquid surface ripple
    function noise3D(x: number, y: number, z: number, time: number) {
      return (
        Math.sin(x * 2.2 + time) *
        Math.cos(y * 2.5 + time * 1.2) *
        Math.sin(z * 2.1 + time * 0.8) *
        0.35
      );
    }

    // Mouse Interaction
    let targetRotationX = 0;
    let targetRotationY = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      mouseY = (event.clientY - rect.top - rect.height / 2) / (rect.height / 2);
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Animation Loop
    let animationFrameId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Continuous Rotation
      mesh.rotation.y = elapsedTime * 0.35;
      mesh.rotation.x = elapsedTime * 0.2;
      mesh.rotation.z = Math.sin(elapsedTime * 0.25) * 0.15;

      // Mouse inertia tracking
      targetRotationY += (mouseX * 0.5 - targetRotationY) * 0.05;
      targetRotationX += (mouseY * 0.5 - targetRotationX) * 0.05;

      mesh.rotation.y += targetRotationY * 0.02;
      mesh.rotation.x += targetRotationX * 0.02;

      // Morphing Liquid Surface Displacement
      const positions = geometry.attributes.position;
      const count = positions.count;

      for (let i = 0; i < count; i++) {
        const uX = initialPositions[i * 3];
        const uY = initialPositions[i * 3 + 1];
        const uZ = initialPositions[i * 3 + 2];

        // Compute vertex displacement offset
        const displacement = noise3D(uX, uY, uZ, elapsedTime * 1.5);
        const normalScale = 1 + displacement;

        positions.setXYZ(i, uX * normalScale, uY * normalScale, uZ * normalScale);
      }

      positions.needsUpdate = true;
      geometry.computeVertexNormals();

      // Light orbit motion
      light1.position.x = Math.sin(elapsedTime * 0.8) * 5;
      light1.position.z = Math.cos(elapsedTime * 0.8) * 5;

      light2.position.y = Math.sin(elapsedTime * 0.6) * 4;
      light2.position.x = Math.cos(elapsedTime * 0.6) * 4;

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height);
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[450px] lg:min-h-[600px] relative cursor-grab active:cursor-grabbing flex items-center justify-center"
    />
  );
}
