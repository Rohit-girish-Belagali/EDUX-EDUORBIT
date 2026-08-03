"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function RotatingEducationArtifact() {
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
    camera.position.set(0, 0.5, 7.5);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    container.appendChild(renderer.domElement);

    // Group holding the entire Education Artifact
    const artifactGroup = new THREE.Group();
    scene.add(artifactGroup);

    // Common Metallic & Silver Glass Materials
    const capMaterial = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.8,
      roughness: 0.2,
    });

    const accentSilverMaterial = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      metalness: 0.95,
      roughness: 0.1,
    });

    const glowingCoreMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xd4d4d8,
      emissiveIntensity: 0.8,
      metalness: 0.5,
      roughness: 0.1,
    });

    const glassPageMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xf4f4f5,
      transmission: 0.6,
      opacity: 0.9,
      transparent: true,
      roughness: 0.15,
      ior: 1.5,
      clearcoat: 1.0,
    });

    // 1. GRADUATION CAP (Mortarboard)
    const capGroup = new THREE.Group();

    // Top square plate (rotated 45 deg for diamond look)
    const topPlateGeo = new THREE.BoxGeometry(2.4, 0.08, 2.4);
    const topPlate = new THREE.Mesh(topPlateGeo, capMaterial);
    topPlate.rotation.y = Math.PI / 4;
    topPlate.position.y = 0.5;
    capGroup.add(topPlate);

    // Skull cap base
    const skullCapGeo = new THREE.CylinderGeometry(0.7, 0.8, 0.45, 32);
    const skullCap = new THREE.Mesh(skullCapGeo, capMaterial);
    skullCap.position.y = 0.25;
    capGroup.add(skullCap);

    // Center button on top of cap
    const capButtonGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.06, 16);
    const capButton = new THREE.Mesh(capButtonGeo, accentSilverMaterial);
    capButton.position.y = 0.56;
    capGroup.add(capButton);

    // Tassel string & drop
    const tasselGroup = new THREE.Group();
    const stringGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.8, 8);
    const stringMesh = new THREE.Mesh(stringGeo, accentSilverMaterial);
    stringMesh.position.set(0.35, 0.4, 0.35);
    stringMesh.rotation.z = -Math.PI / 6;
    tasselGroup.add(stringMesh);

    const tasselDropGeo = new THREE.ConeGeometry(0.08, 0.25, 12);
    const tasselDrop = new THREE.Mesh(tasselDropGeo, accentSilverMaterial);
    tasselDrop.position.set(0.55, 0.05, 0.55);
    tasselGroup.add(tasselDrop);

    capGroup.add(tasselGroup);

    // Position Cap in upper portion of artifact
    capGroup.position.y = 0.7;
    artifactGroup.add(capGroup);

    // 2. FLOATING OPEN BOOK (Below Graduation Cap)
    const bookGroup = new THREE.Group();

    // Left Page
    const pageShape = new THREE.Shape();
    pageShape.moveTo(0, 0);
    pageShape.bezierCurveTo(0.4, 0.15, 0.8, 0.15, 1.2, 0);
    pageShape.lineTo(1.2, 1.5);
    pageShape.bezierCurveTo(0.8, 1.65, 0.4, 1.65, 0, 1.5);
    pageShape.closePath();

    const extrudeSettings = { depth: 0.02, bevelEnabled: false };
    const pageGeo = new THREE.ExtrudeGeometry(pageShape, extrudeSettings);

    const leftPage = new THREE.Mesh(pageGeo, glassPageMaterial);
    leftPage.rotation.y = Math.PI / 8;
    leftPage.position.set(-1.1, -0.75, 0);
    bookGroup.add(leftPage);

    // Right Page
    const rightPage = new THREE.Mesh(pageGeo, glassPageMaterial);
    rightPage.rotation.y = -Math.PI / 8;
    rightPage.scale.x = -1;
    rightPage.position.set(1.1, -0.75, 0);
    bookGroup.add(rightPage);

    // Book Spine / Core Glow
    const spineGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.5, 16);
    const spine = new THREE.Mesh(spineGeo, glowingCoreMaterial);
    spine.position.set(0, 0, 0);
    bookGroup.add(spine);

    bookGroup.position.y = -0.6;
    artifactGroup.add(bookGroup);

    // 3. ORBITING KNOWLEDGE RINGS
    const ringGroup = new THREE.Group();
    const ringGeo = new THREE.TorusGeometry(2.3, 0.025, 16, 100);

    const ring1 = new THREE.Mesh(ringGeo, accentSilverMaterial);
    ring1.rotation.x = Math.PI / 3;
    ringGroup.add(ring1);

    const ring2 = new THREE.Mesh(ringGeo, accentSilverMaterial);
    ring2.rotation.y = Math.PI / 4;
    ring2.rotation.x = -Math.PI / 6;
    ringGroup.add(ring2);

    const ring3 = new THREE.Mesh(ringGeo, accentSilverMaterial);
    ring3.rotation.z = Math.PI / 3;
    ringGroup.add(ring3);

    // Orbiting particle spheres along rings
    const particleGeo = new THREE.SphereGeometry(0.09, 16, 16);
    const p1 = new THREE.Mesh(particleGeo, glowingCoreMaterial);
    ring1.add(p1);
    p1.position.x = 2.3;

    const p2 = new THREE.Mesh(particleGeo, glowingCoreMaterial);
    ring2.add(p2);
    p2.position.y = 2.3;

    const p3 = new THREE.Mesh(particleGeo, glowingCoreMaterial);
    ring3.add(p3);
    p3.position.z = 2.3;

    artifactGroup.add(ringGroup);

    // Lighting Setup for Pristine Metallic Black & White Studio
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 2.5);
    dirLight1.position.set(4, 6, 5);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa1a1aa, 1.5);
    dirLight2.position.set(-5, -3, -2);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xffffff, 4, 15);
    pointLight.position.set(0, 0, 3);
    scene.add(pointLight);

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

    // Animation Loop with Ultra-Fast Rotation Speed
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Ultra-fast main 3D rotation speed (2.5x faster than before)
      artifactGroup.rotation.y = elapsedTime * 3.2;
      artifactGroup.rotation.x = Math.sin(elapsedTime * 2.0) * 0.35;

      // Ultra-fast orbital ring rotation speeds
      ring1.rotation.z = elapsedTime * 4.2;
      ring2.rotation.z = -elapsedTime * 3.8;
      ring3.rotation.y = elapsedTime * 4.8;

      // Fast floating breathing motion
      artifactGroup.position.y = Math.sin(elapsedTime * 4.5) * 0.22;

      // High-speed mouse tracking response
      targetRotationY += (mouseX * 2.0 - targetRotationY) * 0.2;
      targetRotationX += (mouseY * 2.0 - targetRotationX) * 0.2;

      artifactGroup.rotation.y += targetRotationY * 0.08;
      artifactGroup.rotation.x += targetRotationX * 0.08;

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

      topPlateGeo.dispose();
      skullCapGeo.dispose();
      capButtonGeo.dispose();
      stringGeo.dispose();
      tasselDropGeo.dispose();
      pageGeo.dispose();
      spineGeo.dispose();
      ringGeo.dispose();
      particleGeo.dispose();

      capMaterial.dispose();
      accentSilverMaterial.dispose();
      glowingCoreMaterial.dispose();
      glassPageMaterial.dispose();
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
