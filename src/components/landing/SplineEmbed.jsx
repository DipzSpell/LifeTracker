/**
 * SplineEmbed.jsx — renders the interactive cube-cluster scene via
 * @splinetool/react-spline (the actual runtime, not an <iframe> of
 * Spline's hosted page). This renders straight into our own DOM/canvas —
 * no foreign nav bar, no nested "other website" — because it's loading a
 * raw .splinecode asset, not someone else's published page.
 *
 * Lazy-imported: the Spline runtime is a large WebGL library, so it's
 * pulled into its own chunk and only fetched once this component actually
 * mounts (i.e. never for mobile visitors who don't tap the gate in
 * HeroSection.jsx).
 */
import { lazy, Suspense, useState } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

const SCENE_URL = "/Spline/interactive_ai_website.spline";

/* Template objects to hide on load — everything that isn't the cube
   cluster/camera/light: nav+headline text, the two buttons ("dis"cover /
   "get" + their Rectangle backgrounds), the scroll chevron ("Shape"),
   and the baked-in light gradient backdrop image. */
const HIDDEN_OBJECTS = [
  /^Text( \d+)?$/,
  "dis",
  "get",
  "Rectangle 2",
  "Rectangle 3",
  "Rectangle 4",
  "Shape",
  /abstract-luxury-gradient/,
];

function LoadingSkeleton() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-10 h-10">
          <div className="absolute inset-0 rounded-full border-2" style={{ borderColor: "var(--border-glass)" }} />
          <div
            className="absolute inset-0 rounded-full border-2 animate-spin"
            style={{ borderColor: "var(--accent) transparent transparent transparent" }}
          />
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>Loading 3D scene...</p>
      </div>
    </div>
  );
}

export default function SplineEmbed({ className = "" }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={`spline-embed relative w-full h-full overflow-hidden ${className}`}>
      {!loaded && <LoadingSkeleton />}
      <Suspense fallback={null}>
        <Spline
          scene={SCENE_URL}
          onLoad={(app) => {
            // The .spline file is the stock "Interactive AI Website"
            // template — nav text, buttons, and a light backdrop are scene
            // objects. Hide everything except the cube cluster so only the
            // cubes float over our own dark page.
            try {
              for (const obj of app.getAllObjects()) {
                if (HIDDEN_OBJECTS.some((m) => (typeof m === "string" ? obj.name === m : m.test(obj.name)))) {
                  obj.visible = false;
                }
              }
            } catch (e) {
              console.warn("[SplineEmbed] object hiding failed:", e.message);
            }
            try {
              // Template ships a light background and frames the cluster
              // at x≈552 (right of a full-width hero) while the camera
              // looks at x≈88 — recenter it for our half-width column and
              // let our dark page show through the canvas.
              app.setBackgroundColor("rgba(0,0,0,0)");
              const clones = app.findObjectByName("Cube Clones");
              if (clones) clones.position.x = 100;
            } catch (e) {
              console.warn("[SplineEmbed] recenter failed:", e.message);
            }
            setLoaded(true);
          }}
          style={{ width: "100%", height: "100%", opacity: loaded ? 1 : 0, transition: "opacity 0.6s ease" }}
        />
      </Suspense>
    </div>
  );
}
