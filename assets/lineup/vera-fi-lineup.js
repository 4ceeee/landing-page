// Vera-Fi product lineup: the shaded outline models side by side, each turning to look at the pointer.
//
// Usage:
//   import { mountLineup } from "./vera-fi-lineup.js";
//   const lineup = await mountLineup(document.querySelector("#lineup"));
//   // later, if the element is removed: lineup.destroy();
//
// The container sets the size (give it a width and a height). The canvas is transparent, so the
// page background shows through. Needs three.js (0.169.0) as "three" and "three/addons/".
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MODELS } from "./vera-fi-lineup-models.js";

// Left to right, tallest in the middle, real relative scale. (An array entry stacks models, bottom first.)
export const DEFAULT_ORDER = ["SnubStation Zero", "Vanguard Caldera 12", "Vanguard Stand", "Vanguard Scout", "Series One A40"];

const DEFAULTS = {
  order: DEFAULT_ORDER,
  restYaw: -0.38, // 3/4 view before the pointer moves, and after it leaves the page (radians)
  maxYaw: 0.75, // furthest a product turns left or right
  maxPitch: 0.4, // furthest it tips up or down
  gap: 0.07, // space between products, in metres (models are at real size)
  response: 0.075, // 0..1 per frame at 60 fps; lower is softer
  stagger: 0.18, // products further from the pointer react a little later
  idleSway: true, // gentle sway on touch screens until the first touch
  label: "Vera-Fi Audio products: SnubStation Zero, Vanguard Caldera 12, Vanguard Stand, Vanguard Scout and Series One A40",
};

const toBuffer = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export async function mountLineup(container, options = {}) {
  const o = { ...DEFAULTS, ...options };
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = matchMedia("(pointer: fine)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping; // the models are unlit, keep their exact greys
  const canvas = renderer.domElement;
  canvas.style.cssText = "display:block;width:100%;height:100%";
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", o.label);
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(20, 1, 0.01, 100);
  const loader = new GLTFLoader();

  // One product (or a stack) with its base on y = 0, centred on x and z.
  const build = async (entry) => {
    const group = new THREE.Group();
    let y = 0;
    for (const name of [].concat(entry)) {
      if (!MODELS[name]) throw new Error(`No model named "${name}"`);
      const m = (await loader.parseAsync(toBuffer(MODELS[name]), "")).scene;
      const b = new THREE.Box3().setFromObject(m), c = b.getCenter(new THREE.Vector3());
      m.position.set(-c.x, y - b.min.y, -c.z);
      y += b.max.y - b.min.y;
      group.add(m);
    }
    return group;
  };

  // Line them up: each item turns about its own centre, sitting on the shared floor.
  const items = [];
  let x = 0, height = 0;
  for (const entry of o.order) {
    const model = await build(entry);
    const size = new THREE.Box3().setFromObject(model).getSize(new THREE.Vector3());
    model.position.y = -size.y / 2;
    const pivot = new THREE.Group();
    pivot.add(model);
    // Width on screen at its widest turn, so neighbours never touch while they follow the pointer.
    let footprint = 0;
    for (let a = -o.maxYaw; a <= o.maxYaw + 1e-6; a += o.maxYaw / 8)
      footprint = Math.max(footprint, Math.abs(size.x * Math.cos(a)) + Math.abs(size.z * Math.sin(a)));
    pivot.position.set(x + footprint / 2, size.y / 2, 0);
    pivot.rotation.y = o.restYaw;
    x += footprint + o.gap;
    height = Math.max(height, size.y);
    scene.add(pivot);
    items.push({ pivot, yaw: o.restYaw, pitch: 0 });
  }
  const width = x - o.gap;
  for (const it of items) it.pivot.position.x -= width / 2;

  // Camera: fit the whole lineup with some air, looking slightly down.
  let dist = 1;
  const fit = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    dist = Math.max((height * 1.18) / (2 * t), (width * 1.12) / (2 * t * camera.aspect));
    camera.position.set(0, height * 0.5 + dist * 0.12, dist);
    camera.lookAt(0, height * 0.46, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    wake();
  };

  // The pointer as a point in 3D: where the camera ray under the cursor meets a plane in front of the
  // lineup. Every product looks at that same point, so each turns by its own amount, in every direction.
  const ndc = new THREE.Vector2(), ray = new THREE.Raycaster(), look = new THREE.Vector3(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const pointer = { x: 0, y: 0, active: false };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -3, 3);
    pointer.y = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -3, 3);
    pointer.active = true;
    wake();
  };
  const onLeave = () => { pointer.active = false; wake(); };

  let raf = 0, last = 0, visible = true, t0 = performance.now();
  const frame = (now) => {
    raf = 0;
    const dt = Math.min(0.05, (now - (last || now)) / 1000) || 1 / 60;
    last = now;
    const sway = o.idleSway && !finePointer && !pointer.active;
    const following = pointer.active || sway;
    if (following) {
      ndc.set(sway ? Math.sin((now - t0) / 2600) * 0.7 : pointer.x, sway ? 0.1 : pointer.y);
      ray.setFromCamera(ndc, camera);
      plane.constant = -Math.max(width, height) * 0.4; // a plane just in front of the products, toward the camera
      if (!ray.ray.intersectPlane(plane, look)) look.set(0, height / 2, dist);
    }
    let moving = sway;
    items.forEach((it) => {
      const p = it.pivot.position;
      let yawT = o.restYaw, pitchT = 0;
      if (following) {
        const dx = look.x - p.x, dy = look.y - p.y, dz = look.z - p.z;
        yawT = clamp(Math.atan2(dx, dz), -o.maxYaw, o.maxYaw);
        pitchT = clamp(-Math.atan2(dy, Math.hypot(dx, dz)), -o.maxPitch, o.maxPitch);
      }
      const lag = 1 + (o.stagger * Math.abs(look.x - p.x)) / (width / 2);
      const k = 1 - Math.pow(1 - o.response / lag, dt * 60);
      it.yaw += (yawT - it.yaw) * k;
      it.pitch += (pitchT - it.pitch) * k;
      it.pivot.rotation.set(it.pitch, it.yaw, 0, "YXZ");
      if (Math.abs(yawT - it.yaw) > 1e-4 || Math.abs(pitchT - it.pitch) > 1e-4) moving = true;
    });
    renderer.render(scene, camera);
    if (moving && visible && !reduced) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }

  // Only animate while on screen and the tab is open. Reduced motion: a still 3/4 view.
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) wake(); });
  io.observe(container);
  const ro = new ResizeObserver(fit);
  ro.observe(container);
  const onVis = () => { if (!document.hidden) wake(); };
  if (!reduced) {
    addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
  }
  document.addEventListener("visibilitychange", onVis);
  fit();

  return {
    canvas,
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect(); ro.disconnect();
      removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("visibilitychange", onVis);
      scene.traverse((n) => { n.geometry?.dispose(); [].concat(n.material ?? []).forEach((m) => m.dispose()); });
      renderer.dispose();
      canvas.remove();
    },
  };
}
