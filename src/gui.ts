import GUI, { type Controller } from "lil-gui";
import { Color } from "three/webgpu";
import { PRESETS, type FlowerPreset } from "./presets";
import { assignPreset, type FlowerSettings, type MotionMode } from "./settings";
import type { FlowerView } from "./flowerMaterial";

type RefreshKind = "mesh" | "instances" | "material" | "uniform";
type BackdropName = "black" | "gray";

type Panel = {
  refresh: () => void;
  tickPreset: (now: number) => void;
};

type Choice = {
  name: string;
  row: HTMLElement;
};

const PRESET_MS = 900;

export function createPanel(
  settings: FlowerSettings,
  flower: FlowerView,
  setBackdrop: (tone: BackdropName) => void,
): Panel {
  const controllers: Controller[] = [];
  const presetNames = PRESETS.map((preset) => preset.name);
  const selection = { preset: presetNames[0] ?? "VelvetDahlia" };
  const presetRows: Choice[] = [];
  const backdropRows: Choice[] = [];
  let backdrop: BackdropName = "black";
  let blend: {
    name: string;
    target: FlowerPreset;
    start: Record<string, number | string>;
    startTime: number;
  } | null = null;

  const track = (controller: Controller, kind: RefreshKind, key?: keyof FlowerSettings): Controller => {
    controller.onChange(() => {
      apply(kind, key);
    });
    controllers.push(controller);
    return controller;
  };

  const apply = (kind: RefreshKind, key?: keyof FlowerSettings): void => {
    if (key) writeUniform(key);
    switch (kind) {
      case "mesh":
        flower.rebuildPetal();
        break;
      case "instances":
        flower.updateInstances();
        break;
      case "material":
        flower.updateMaterial();
        break;
      case "uniform":
        break;
      default: {
        const unreachable: never = kind;
        throw new Error(unreachable);
      }
    }
  };

  const writeUniform = (key: keyof FlowerSettings): void => {
    if (typeof settings[key] === "number" || typeof settings[key] === "boolean") flower.syncUniforms();
  };

  const writeSetting = (key: keyof FlowerSettings, value: FlowerSettings[keyof FlowerSettings]): void => {
    const record: Record<string, FlowerSettings[keyof FlowerSettings]> = settings;
    record[key] = value;
  };

  const refresh = (): void => {
    for (const controller of controllers) controller.updateDisplay();
  };

  const finishPreset = (name: string): void => {
    const preset = PRESETS.find((entry) => entry.name === name);
    if (!preset) return;
    assignPreset(settings, preset);
    selection.preset = name;
    flower.syncUniforms();
    flower.updateMaterial();
    flower.rebuildPetal();
    flower.updateInstances();
    flower.setWireframe(settings.wireframe);
    refresh();
    markChoices();
    paintAccent();
  };

  const markChoices = (): void => {
    for (const choice of presetRows) choice.row.classList.toggle("is-current", choice.name === selection.preset);
    for (const choice of backdropRows) choice.row.classList.toggle("is-current", choice.name === backdrop);
  };

  let accentRoot: HTMLElement | null = null;
  const paintAccent = (): void => {
    accentRoot?.style.setProperty("--accent", settings.materialColorTop);
    accentRoot?.style.setProperty("--accent-deep", settings.materialColorBottom);
  };

  const chooseBackdrop = (tone: BackdropName): void => {
    backdrop = tone;
    setBackdrop(tone);
    markChoices();
  };

  const startPreset = (name: string): void => {
    const preset = PRESETS.find((entry) => entry.name === name);
    if (!preset) return;
    selection.preset = name;
    markChoices();
    const start: Record<string, number | string> = {};
    for (const key of Object.keys(preset) as (keyof FlowerPreset)[]) {
      if (key === "name") continue;
      const next = preset[key];
      const current = settings[key];
      const numeric = typeof next === "number" && typeof current === "number";
      const color = typeof next === "string" && typeof current === "string" && next.startsWith("#") && current.startsWith("#");
      if ((numeric || color) && (typeof current === "number" || typeof current === "string")) start[key] = current;
    }
    blend = { name, target: preset, start, startTime: performance.now() };
  };

  const tickPreset = (now: number): void => {
    if (!blend) return;
    const { name, target, start, startTime } = blend;
    const progress = Math.min(Math.max((now - startTime) / PRESET_MS, 0), 1);
    const eased = progress * progress * (3 - 2 * progress);
    let rebuild = false;
    let instances = false;
    let material = false;
    for (const key of Object.keys(target) as (keyof FlowerPreset)[]) {
      if (key === "name") continue;
      const next = target[key];
      const current = settings[key];
      if (typeof next === "number" && typeof current === "number") {
        const from = typeof start[key] === "number" ? start[key] : current;
        writeSetting(key, from + (next - from) * eased);
        if (key.startsWith("material")) material = true;
        else if (movesInstances(key)) instances = true;
        else rebuild = true;
        continue;
      }
      if (typeof next === "string" && typeof current === "string" && next.startsWith("#") && current.startsWith("#")) {
        const from = new Color(typeof start[key] === "string" ? start[key] : current);
        from.lerp(new Color(next), eased);
        writeSetting(key, `#${from.getHexString()}`);
        material = true;
        continue;
      }
      if (typeof next === "string" && typeof current === "string" && current !== next) {
        writeSetting(key, next);
        rebuild = true;
      }
    }
    flower.syncUniforms();
    if (rebuild) flower.rebuildPetal();
    if (instances) flower.updateInstances();
    if (material) flower.updateMaterial();
    refresh();
    paintAccent();
    if (progress >= 1) {
      finishPreset(name);
      blend = null;
    }
  };

  const stepPreset = (direction: 1 | -1): void => {
    const index = presetNames.indexOf(selection.preset);
    const next = (index + direction + presetNames.length) % presetNames.length;
    const name = presetNames[next];
    if (!name) return;
    startPreset(name);
  };

  let armed: MotionMode = settings.motionMode === "off" ? "bloom" : settings.motionMode;
  const togglePlayback = (): void => {
    if (settings.motionMode === "off") settings.motionMode = armed;
    else {
      armed = settings.motionMode;
      settings.motionMode = "off";
    }
    refresh();
  };

  window.addEventListener("keydown", (event) => {
    const tag = document.activeElement?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (event.code === "Space") {
      event.preventDefault();
      togglePlayback();
    } else if (event.code === "ArrowRight") {
      event.preventDefault();
      stepPreset(1);
    } else if (event.code === "ArrowLeft") {
      event.preventDefault();
      stepPreset(-1);
    }
  });

  const copySettings = async (): Promise<void> => {
    const text = JSON.stringify(settings, null, 2);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement("textarea");
      area.value = text;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
  };

  const pasteSettings = async (): Promise<void> => {
    try {
      const parsed: unknown = JSON.parse(await navigator.clipboard.readText());
      if (!parsed || typeof parsed !== "object") return;
      const record = parsed as Record<string, unknown>;
      for (const key of Object.keys(settings) as (keyof FlowerSettings)[]) {
        const next = record[key];
        if (typeof next === typeof settings[key]) {
          Object.assign(settings, { [key]: next });
        }
      }
      flower.syncUniforms();
      flower.updateMaterial();
      flower.rebuildPetal();
      flower.updateInstances();
      flower.setWireframe(settings.wireframe);
      refresh();
    } catch (error) {
      console.error("Paste failed:", error);
    }
  };

  const gui = new GUI({ title: "Flower" });
  accentRoot = gui.domElement;
  const flowers = gui.addFolder("Flowers");
  for (const preset of PRESETS) {
    const choice = flowers.add({ pick: () => startPreset(preset.name) }, "pick").name(presetLabel(preset.name));
    choice.domElement.classList.add("preset-choice");
    presetRows.push({ name: preset.name, row: choice.domElement });
  }
  const settingsFolder = gui.addFolder("Settings");
  settingsFolder.add({ prevPreset: () => stepPreset(-1) }, "prevPreset").name("Previous");
  settingsFolder.add({ nextPreset: () => stepPreset(1) }, "nextPreset").name("Next");
  settingsFolder.add({ copySettings }, "copySettings").name("Copy Settings");
  settingsFolder.add({ pasteSettings }, "pasteSettings").name("Paste Settings");
  const stage = gui.addFolder("Stage");
  for (const tone of ["black", "gray"] as const) {
    const choice = stage.add({ pick: () => chooseBackdrop(tone) }, "pick").name(tone === "black" ? "Black" : "Medium Gray");
    choice.domElement.classList.add("stage-choice");
    backdropRows.push({ name: tone, row: choice.domElement });
  }
  markChoices();
  paintAccent();

  const petal = gui.addFolder("Petal");
  const profileControl = petal.add(settings, "petalProfile", {
    Pointed: "pointed",
    Round: "round",
    Strap: "strap",
    Spoon: "spoon",
    Bell: "bell",
  }).name("Profile").onChange(() => {
    flower.syncUniforms();
    flower.rebuildPetal();
  });
  controllers.push(profileControl);
  number(petal, "length", 1, 8, 0.01, "Length", "mesh");
  number(petal, "width", 0.5, 3, 0.01, "Width", "mesh");
  number(petal, "segments", 8, 64, 1, "Length Segments", "mesh");
  number(petal, "widthSegments", 8, 48, 1, "Width Segments", "mesh");
  number(petal, "baseWidth", 0.05, 1, 0.01, "Base Width", "mesh");
  number(petal, "tipWidth", 0.1, 1, 0.01, "Tip Width", "mesh");
  number(petal, "rootLength", 0.02, 0.6, 0.01, "Root Length", "mesh");
  number(petal, "bloomRootRoundness", 0, 1.5, 0.01, "Root Roundness", "mesh");
  const dome = petal.addFolder("Dome");
  number(dome, "budDome", 0, 0.8, 0.01, "Bud Amount", "uniform");
  number(dome, "budDomePower", 0.5, 6, 0.01, "Bud Power", "uniform");
  number(dome, "bloomDome", 0, 0.8, 0.01, "Bloom Amount", "uniform");
  number(dome, "bloomDomePower", 0.5, 6, 0.01, "Bloom Power", "uniform");

  const curvature = gui.addFolder("Curvature");
  const bud = curvature.addFolder("Bud");
  const bloom = curvature.addFolder("Bloom");
  for (const key of ["budRoot", "budSpine", "budTip", "budSide"] as const) {
    number(bud, key, -Math.PI, Math.PI, 0.01, key.replace("bud", "").replace(/([A-Z])/g, " $1").trim(), "uniform");
  }
  for (const key of ["bloomRoot", "bloomSpine", "bloomTip", "bloomSide"] as const) {
    number(bloom, key, -Math.PI, Math.PI, 0.01, key.replace("bloom", "").replace(/([A-Z])/g, " $1").trim(), "uniform");
  }

  const distribution = gui.addFolder("Distribution");
  const phyllotaxis = distribution.addFolder("Phyllotaxis");
  number(phyllotaxis, "instanceCount", 1, 300, 1, "Count", "instances");
  number(phyllotaxis, "phyllotaxisStartRadius", 0, 1, 0.01, "Start Radius", "instances");
  number(phyllotaxis, "phyllotaxisSpacing", 0.01, 0.3, 0.005, "Spacing", "instances");
  number(phyllotaxis, "phyllotaxisExponent", 0.3, 0.8, 0.01, "Exponent", "instances");
  number(phyllotaxis, "phyllotaxisAngle", 90, 180, 0.1, "Angle", "instances");
  number(phyllotaxis, "radialJitter", 0, 0.1, 0.001, "Radial Jitter", "instances");
  number(phyllotaxis, "angularJitter", 0, 0.15, 0.001, "Angular Jitter", "instances");
  const index = distribution.addFolder("Index Variation");
  number(index, "indexYSpacing", -0.1, 0.1, 0.001, "Y Spacing", "instances");
  number(index, "indexYOffset", -5, 5, 0.01, "Y Offset", "instances");
  number(index, "indexScaleMin", 0.3, 1.2, 0.01, "Scale Min", "uniform");
  number(index, "indexScaleMax", 0.5, 1.5, 0.01, "Scale Max", "uniform");
  number(index, "indexScalePower", 0.2, 2, 0.01, "Scale Power", "uniform");
  number(index, "indexLengthMin", 0.5, 1.2, 0.01, "Length Min", "uniform");
  number(index, "indexLengthMax", 0.5, 1.3, 0.01, "Length Max", "uniform");
  number(index, "indexWidthMin", 0.5, 1.2, 0.01, "Width Min", "uniform");
  number(index, "indexWidthMax", 0.5, 1.3, 0.01, "Width Max", "uniform");
  number(index, "indexBendMin", -0.5, 0.5, 0.01, "Bend Min", "uniform");
  number(index, "indexBendMax", -0.5, 0.7, 0.01, "Bend Max", "uniform");
  number(index, "indexTwist", 0, 0.2, 0.005, "Twist", "uniform");
  number(index, "indexVariation", 0, 0.15, 0.005, "Variation", "uniform");

  const growth = gui.addFolder("Growth");
  const motionChoices: Record<string, MotionMode> = {
    Off: "off",
    Bloom: "bloom",
    Rotate: "rotate",
    Sway: "sway",
  };
  growth.add(settings, "motionMode", motionChoices).name("Mode").onChange((mode: MotionMode) => {
    if (mode !== "off") armed = mode;
  });
  number(growth, "animation", 0, 10, 0.01, "Progress", "uniform");
  number(growth, "animationSpread", 0, 1, 0.01, "Spread", "uniform");
  number(growth, "animationDuration", 0.1, 1, 0.01, "Duration", "uniform");
  number(growth, "animationOrder", 0.2, 3, 0.01, "Order", "uniform");
  number(growth, "animationJitter", 0, 0.15, 0.005, "Jitter", "uniform");
  growth.add({
    reset() {
      settings.animation = 0;
      flower.syncUniforms();
      refresh();
    },
  }, "reset").name("Reset");
  growth.add({
    half() {
      settings.animation = 5;
      flower.syncUniforms();
      refresh();
    },
  }, "half").name("Half Bloom");
  growth.add({
    bloom() {
      settings.animation = 10;
      flower.syncUniforms();
      refresh();
    },
  }, "bloom").name("Full Bloom");
  const materialFolder = gui.addFolder("Material");
  const color = materialFolder.addFolder("Color");
  colorControl(color, "materialColorBottom", "Bottom");
  colorControl(color, "materialColorTop", "Top");
  colorControl(color, "materialTipColor", "Tip");
  colorControl(color, "materialBorderColor", "Border");
  colorControl(color, "materialHighlightColor", "Highlight");
  number(color, "materialHueShift", -Math.PI, Math.PI, 0.01, "Hue Shift", "material");
  number(color, "materialColorVariation", 0, 0.4, 0.01, "Variation", "material");
  number(color, "materialVariationHue", 0, 0.15, 0.001, "Hue Variation", "material");
  number(color, "materialVariationLightness", 0, 0.3, 0.01, "Lightness Variation", "material");
  const surface = materialFolder.addFolder("Surface");
  number(surface, "materialRoughness", 0, 1, 0.01, "Roughness", "material");
  number(surface, "materialMetalness", 0, 1, 0.01, "Metalness", "material");
  number(surface, "materialSpecular", 0, 1, 0.01, "Specular", "material");
  number(surface, "materialIOR", 1, 2.5, 0.01, "IOR", "material");
  number(surface, "materialTransmission", 0, 1, 0.01, "Transmission", "material");
  number(surface, "materialThickness", 0, 1, 0.01, "Thickness", "material");
  number(surface, "materialIridescence", 0, 1, 0.01, "Iridescence", "material");
  const coat = materialFolder.addFolder("Clearcoat");
  number(coat, "materialClearcoat", 0, 1, 0.01, "Amount", "material");
  number(coat, "materialClearcoatRoughness", 0, 1, 0.01, "Roughness", "material");
  const edge = materialFolder.addFolder("Edge / Velvet");
  number(edge, "materialBorderIntensity", 0, 2, 0.01, "Border Intensity", "material");
  number(edge, "materialBorderWidth", 0.1, 1, 0.01, "Border Width", "material");
  number(edge, "materialBorderGlow", 0, 2, 0.01, "Border Glow", "material");
  number(edge, "materialSheenIntensity", 0, 1, 0.01, "Sheen", "material");
  number(edge, "materialSheenPower", 1, 8, 0.1, "Sheen Power", "material");

  const debug = gui.addFolder("Debug");
  track(debug.add(settings, "wireframe").name("Wireframe"), "uniform").onChange((enabled: boolean) => {
    flower.setWireframe(enabled);
  });
  debug.add({ reload: () => location.reload() }, "reload").name("Reload");

  function number<K extends NumericKey>(
    folder: GUI,
    key: K,
    min: number,
    max: number,
    step: number,
    label: string,
    kind: RefreshKind,
  ): void {
    const controller = track(folder.add(settings, key, min, max, step).name(label), kind, key);
    paintRange(controller, min, max);
  }

  function colorControl(folder: GUI, key: ColorKey, label: string): void {
    track(folder.addColor(settings, key).name(label), "material", key);
  }

  return { refresh, tickPreset };
}

type NumericKey = {
  [K in keyof FlowerSettings]: FlowerSettings[K] extends number ? K : never;
}[keyof FlowerSettings];

type ColorKey = {
  [K in keyof FlowerSettings]: FlowerSettings[K] extends string ? K : never;
}[keyof FlowerSettings];

function paintRange(controller: Controller, min: number, max: number): void {
  const crosses = min < 0 && max > 0;
  const span = max - min;
  const zero = crosses ? -min / span : 0;
  const fill = controller.domElement.querySelector(".lil-fill");
  if (!(fill instanceof HTMLElement) || span === 0) return;
  controller.domElement.classList.add(crosses ? "range-out" : "range-up");
  controller.domElement.style.setProperty("--zero", `${zero * 100}%`);
  const showValue = controller.updateDisplay.bind(controller);
  controller.updateDisplay = () => {
    showValue();
    const value = Number(controller.getValue());
    const percent = Math.min(1, Math.max(0, (value - min) / span));
    const from = crosses ? Math.min(percent, zero) : 0;
    const to = crosses ? Math.max(percent, zero) : percent;
    fill.style.left = `${from * 100}%`;
    fill.style.width = `${(to - from) * 100}%`;
    fill.style.setProperty("--origin", String(from));
    controller.domElement.classList.toggle("range-neg", crosses && value < 0);
    return controller;
  };
  controller.updateDisplay();
}

function presetLabel(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function movesInstances(key: string): boolean {
  return key.startsWith("index")
    || key.startsWith("phyllotaxis")
    || key.startsWith("collision")
    || key.includes("Jitter")
    || key.includes("Spacing")
    || key.includes("Radius");
}
