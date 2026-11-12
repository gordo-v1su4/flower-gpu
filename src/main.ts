import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  OrthographicCamera,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  WebGPURenderer,
} from "three/webgpu";
import type { MotionMode } from "./settings";
import { createFlower } from "./flowerMaterial";
import { createPanel } from "./gui";
import { createSettings } from "./settings";

const canvas = document.querySelector("#view");
const status = document.querySelector("#status");
if (!(canvas instanceof HTMLCanvasElement) || !(status instanceof HTMLParagraphElement)) {
  throw new Error("Missing flower page");
}
const pageStatus = status;

const settings = createSettings();
const renderer = new WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new Scene();
const backdrop = new Color("#080808");
scene.background = backdrop;

function setBackdrop(tone: "black" | "gray"): void {
  backdrop.set(tone === "gray" ? "#6a6a6a" : "#080808");
  document.body.style.background = `#${backdrop.getHexString()}`;
}
const camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(0, 3, 3.5);
const ortho = new OrthographicCamera(-2, 2, 2, -2, 0.01, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, 0, 0);
controls.autoRotate = false;

type StudyView = "front" | "left" | "right" | "top" | "threeQuarter";
type StudyCommand = StudyView | "home";

let studyView: StudyView | null = null;

function fitOrtho(): void {
  const aspect = window.innerWidth / window.innerHeight;
  const halfHeight = 2.15;
  ortho.top = halfHeight;
  ortho.bottom = -halfHeight;
  ortho.left = -halfHeight * aspect;
  ortho.right = halfHeight * aspect;
  ortho.updateProjectionMatrix();
}

function placeStudyView(view: StudyView): void {
  const distance = 8;
  const focusY = view === "top" ? 0.2 : 0.62;
  let x = 0;
  let y = focusY;
  let z = distance;
  switch (view) {
    case "front":
      break;
    case "left":
      x = -distance;
      z = 0;
      break;
    case "right":
      x = distance;
      z = 0;
      break;
    case "top":
      y = distance;
      z = 0.02;
      break;
    case "threeQuarter":
      x = -distance * 0.62;
      y = distance * 0.7;
      z = distance * 0.5;
      break;
    default: {
      const unreachable: never = view;
      throw new Error(unreachable);
    }
  }
  ortho.position.set(x, y, z);
  ortho.lookAt(-0.45, focusY, 0);
}

function snapFlowerView(view: StudyCommand): void {
  if (view === "home") {
    studyView = null;
    return;
  }
  switch (view) {
    case "front":
    case "left":
    case "right":
    case "top":
    case "threeQuarter":
      studyView = view;
      return;
    default: {
      const unreachable: never = view;
      throw new Error(unreachable);
    }
  }
}

declare global {
  interface Window {
    snapFlowerView: (view: StudyCommand) => void;
  }
}

fitOrtho();
window.snapFlowerView = snapFlowerView;

const flower = createFlower(settings);
const flowerGroup = new Group();
flowerGroup.add(flower.mesh);
scene.add(flowerGroup);

scene.add(new HemisphereLight(0xffffff, 0x9a9a9a, 1.6));
const key = new DirectionalLight(0xffffff, 2.5);
key.position.set(3, 5, 4);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.near = 0.1;
key.shadow.camera.far = 20;
key.shadow.camera.left = -6;
key.shadow.camera.right = 6;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -6;
key.shadow.bias = -1e-4;
key.shadow.normalBias = 0.03;
scene.add(key);
const cool = new DirectionalLight(0xffffff, 0.45);
cool.position.set(-4, 2, 1);
scene.add(cool);
const warm = new DirectionalLight(0xffffff, 1.15);
warm.position.set(2, 3, -5);
scene.add(warm);
const overhead = new DirectionalLight(0xffffff, 1.5);
overhead.position.set(0, 7, 0);
scene.add(overhead);

const panel = createPanel(settings, flower, setBackdrop);

let motionTime = 0;
let last = performance.now();

function applyMotion(mode: MotionMode, dt: number): void {
  switch (mode) {
    case "off":
      controls.autoRotate = false;
      flowerGroup.rotation.y = 0;
      break;
    case "bloom":
      controls.autoRotate = false;
      flowerGroup.rotation.y = 0;
      motionTime += dt * 0.55;
      const opened = Math.sin(motionTime) * 0.5 + 0.5;
      settings.animation = opened * 10;
      flower.syncUniforms();
      panel.refresh();
      break;
    case "rotate":
      controls.autoRotate = true;
      flowerGroup.rotation.y = 0;
      break;
    case "sway":
      controls.autoRotate = false;
      motionTime += dt;
      flowerGroup.rotation.y = Math.sin(motionTime * 0.65) * 0.42;
      break;
    default: {
      const unreachable: never = mode;
      throw new Error(unreachable);
    }
  }
}

function frame(now: number): void {
  try {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    panel.tickPreset(now);
    applyMotion(settings.motionMode, dt);
    controls.update();
    if (studyView === null) {
      renderer.render(scene, camera);
    } else {
      placeStudyView(studyView);
      renderer.render(scene, ortho);
    }
  } catch (error) {
    renderer.setAnimationLoop(null);
    pageStatus.hidden = false;
    pageStatus.textContent = error instanceof Error ? error.message : "Render failed";
  }
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  fitOrtho();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

try {
  await renderer.init();
  const pmrem = new PMREMGenerator(renderer);
  try {
    const hdr = await new RGBELoader().loadAsync("/environments/studio.hdr");
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    scene.environmentIntensity = 0.55;
    hdr.dispose();
  } catch {
    const room = new RoomEnvironment();
    scene.environment = pmrem.fromScene(room, 0.04).texture;
  }
  pmrem.dispose();
  renderer.setAnimationLoop(frame);
} catch (error) {
  pageStatus.hidden = false;
  pageStatus.textContent = error instanceof Error ? error.message : "WebGPU failed to start";
}
