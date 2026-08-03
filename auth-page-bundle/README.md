# Standalone Auth / Login Page Package

This standalone package contains all the code, 3D components, and assets for the **EDU AI 3D Login Page**.

## Files Included

1. `app/(auth)/login/page.tsx` — Main login page component with form, hardcoded credentials, and framer-motion tilt.
2. `app/(auth)/layout.tsx` — Full-bleed dark auth layout.
3. `components/ui/RotatingEducationArtifact.tsx` — Three.js 3D rotating graduation cap, open book, and orbiting knowledge rings.
4. `components/ui/RainbowCursorTrail.tsx` — Cursor-following interactive rainbow fluid trail.
5. `public/images/gradient.png` — Background gradient texture asset.

## Dependencies Needed

Install these npm packages in any Next.js project:

```bash
npm install three framer-motion
npm install --save-dev @types/three
```

## Setup Instructions

1. Copy `app/(auth)` into your Next.js `app/` directory.
2. Copy `components/ui/*` into your `components/ui/` directory.
3. Copy `public/images/gradient.png` into your `public/images/` directory.
4. Ensure Tailwind CSS is configured in your project.
