import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  ACESFilmicToneMapping,
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
import { createSpecimens } from "./specimens";
import { createPanel } from "./gui";
import { createSettings } from "./settings";
import { createPhotography, photoSettings } from "./photography";

const canvas = document.querySelector("#view");
const status = document.querySelector("#status");
if (!(canvas instanceof HTMLCanvasElement) || !(status instanceof HTMLParagraphElement)) {
  throw new Error("Missing flower page");
}
const pageStatus = status;

const settings = createSettings();
const renderer = new WebGPURenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.shadowMap.enabled = true;

const scene = new Scene();
const backdrop = new Color("#0d110f");
scene.background = backdrop;

function setBackdrop(tone: "black" | "gray"): void {
  backdrop.set(tone === "gray" ? "#525752" : "#0d110f");
  document.body.style.background = `#${backdrop.getHexString()}`;
}
const camera = new PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.01, 100);
camera.position.set(2.0, 3.0, 6.5);
const ortho = new OrthographicCamera(-2, 2, 2, -2, 0.01, 50);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.target.set(0, -0.35, 0);
controls.autoRotate = false;

function fitCamera(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.fov = camera.aspect < 0.75 ? 62 : 42;
  camera.updateProjectionMatrix();
}
fitCamera();
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) settings.motionMode = "off";
window.addEventListener("flower-reset-view", () => {
  camera.position.set(2.0, 3.0, 6.5);
  controls.target.set(0, -0.35, 0);
  studyView = "top";
});
window.addEventListener('flower-photograph',()=>{
  settings.motionMode='off';
  camera.position.set(2.2,2.1,5.2);
  camera.fov=35;camera.updateProjectionMatrix();
  controls.target.set(0,0.65,0);
  studyView=null;
});

type StudyView = "front" | "left" | "right" | "top" | "threeQuarter" | "underneath";
type StudyCommand = StudyView | "home";

let studyView: StudyView | null = "top";

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
    case "underneath":
      y = -distance * 0.45;
      z = distance * 0.85;
      break;
    default: {
      const unreachable: never = view;
      throw new Error(unreachable);
    }
  }
  ortho.position.set(x, y, z);
  ortho.lookAt(0, focusY, 0);
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
    case "underneath":
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

const specimens = createSpecimens(settings);
const flower = specimens.view;
const flowerGroup = new Group();
flowerGroup.add(flower.mesh);
scene.add(flowerGroup);

const ambient=new HemisphereLight(0xf4f6ee,0x59645c,0.65);
scene.add(ambient);
const key = new DirectionalLight(0xfff5ec, 2.2);
key.position.set(3, 5, 4);
scene.add(key);
key.castShadow=true;
key.shadow.mapSize.set(2048,2048);
key.shadow.camera.left=-3;key.shadow.camera.right=3;
key.shadow.camera.top=3;key.shadow.camera.bottom=-3;
key.shadow.bias=-0.0003;
key.shadow.normalBias=0.012;
key.shadow.radius=3;
const warm = new DirectionalLight(0xffe6ce, 1.5);
warm.position.set(2, 3, -5);
scene.add(warm);

const panel = createPanel(settings, flower, setBackdrop, specimens.select);
const photography = createPhotography(renderer,scene,camera);

let motionTime = 0;
let last = performance.now();
let previousMode: MotionMode = settings.motionMode;

function applyMotion(mode: MotionMode, dt: number): void {
  if (mode === "bloom" && previousMode !== "bloom") {
    motionTime = Math.PI - Math.asin(Math.max(-1, Math.min(1, settings.animation / 5 - 1)));
  }
  previousMode = mode;
  controls.autoRotate = mode === "rotate";
  if (mode !== "off") motionTime += dt * (mode === "bloom" ? 0.55 : 1);
  flowerGroup.rotation.y = mode === "sway" ? Math.sin(motionTime * 0.52) * 0.12 : 0;
  flowerGroup.rotation.z = mode === "sway" ? Math.sin(motionTime * 0.7) * 0.022 : 0;
  flower.setSway(motionTime, mode === "sway" ? 1 : mode === "bloom" ? 0.22 : 0);
  if (mode === "bloom") {
    const opened = Math.sin(motionTime) * 0.5 + 0.5;
    settings.animation = opened * 10;
    flower.syncUniforms();
    panel.refresh();
  }
}

let presented = false;
let frameSamples=0,frameTotal=0,submitTotal=0;
const loading = document.querySelector<HTMLElement>("#loading");

function showError(error: unknown): void {
  if (loading) loading.hidden = true;
  pageStatus.hidden = false;
  pageStatus.textContent = error instanceof Error ? error.message : "The flower renderer could not start.";
}

function frame(now: number): void {
  try {
    const submitStart=performance.now();
    const interval=now-last;
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    panel.tickPreset(now);
    applyMotion(settings.motionMode, dt);
    controls.update();
    ambient.intensity=photoSettings.enabled?0.35:0.65;
    scene.environmentIntensity=photoSettings.enabled?0.35:0.5;
    if (studyView === null) {
      photography.render();
    } else {
      placeStudyView(studyView);
      renderer.render(scene, ortho);
    }
    frameSamples++; frameTotal+=interval; submitTotal+=performance.now()-submitStart;
    if(frameSamples===120) {
      document.body.dataset.performance=JSON.stringify({frameMs:+(frameTotal/frameSamples).toFixed(2),submitMs:+(submitTotal/frameSamples).toFixed(2),dof:photoSettings.enabled&&photoSettings.depthOfField&&studyView===null});
      frameSamples=0;frameTotal=0;submitTotal=0;
    }
    if (!presented) {
      presented = true;
      document.body.classList.add("is-ready");
      if (loading) loading.hidden = true;
    }
  } catch (error) {
    renderer.setAnimationLoop(null);
    showError(error);
  }
}

window.addEventListener("resize", () => {
  fitCamera();
  fitOrtho();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

try {
  await renderer.init();
  document.body.dataset.backend = (renderer.backend.isWebGPUBackend ? "WebGPU" : "WebGL fallback");
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
  showError(error);
}
