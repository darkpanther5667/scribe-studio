# Scribe Studio — Pro Digital Slate for Educators & Graphics Tablets

Scribe Studio is an infinite digital whiteboard crafted for teachers, online educators, and graphics tablet power users (Huion, Wacom, Apple Pencil, XP-Pen).

---

## ✨ Features

- **Stylus Hardware Calibration:** Native 8192 pressure levels with entry/exit taper and live hardware telemetry sensor.
- **Precision Swept-Capsule Eraser:** Mathematically slices vector paths without erasing background PDF sheets or images.
- **Lasso Selection (`S`):** Freehand Jordan curve ray-casting to group, move, duplicate (`Ctrl+D`), and delete canvas elements.
- **Native PDF Document Import:** In-browser 2x retina vector rasterization via Web Worker with vertical worksheet or horizontal slide deck layout.
- **Draw-and-Hold Smart Ink (`Alt+S`):** Pause drawing for 400ms to automatically snap lines, directional arrows, circles/ellipses, and polygons.
- **Curated Chalk & Slate Pigments:** 7 blackboard pigments + custom hex color picker.
- **Keyboard Shortcuts (`?`):** Instant command cheat sheet for rapid lecture flow.

---

## 🚀 Deploying to Vercel

The project is fully pre-configured for Vercel with `vercel.json` SPA rewrites and clean `npm run build` verification.

### Method 1: Deploy with GitHub (Recommended)

1. Create a new repository on [GitHub](https://github.com/new).
2. In your local terminal inside this directory, push the repository:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```
3. Go to [Vercel Dashboard](https://vercel.com/new).
4. Click **"Import Project"** and select your GitHub repository.
5. Vercel will automatically detect **Vite**:
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Click **Deploy**!

---

### Method 2: Deploy directly via Vercel CLI

In your terminal inside `C:\Users\allbe\.gemini\antigravity\scratch\teaching-whiteboard`, run:

```bash
npx vercel
```

- Follow the prompt to log in via your browser.
- Select your Vercel account or team.
- Confirm defaults (press Enter).
- To deploy to production:
  ```bash
  npx vercel --prod
  ```
