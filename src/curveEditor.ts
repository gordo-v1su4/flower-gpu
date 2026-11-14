import { cubic, HEIGHT_KEYS, INNER_KEYS, OUTER_KEYS, samplePetal, shapeFor, type ShapeSettings } from "./shape";
import type { FlowerSettings } from "./settings";

const NS = "http://www.w3.org/2000/svg";
type CurveKey = keyof ShapeSettings;

export function createCurveEditor(settings: FlowerSettings, mode: "petal" | "height", changed: () => void) {
  const element = document.createElement("div");
  element.className = "curve-editor";
  const title = document.createElement("label");
  title.textContent = mode === "petal" ? "Petal side profile" : "Height across the flower";
  element.append(title);
  const selection = document.createElement("select");
  selection.setAttribute("aria-label", "Petal ring to edit");
  selection.innerHTML = '<option value="inner">Inner petals</option><option value="outer">Outer petals</option>';
  if (mode === "petal") element.append(selection);
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 280 154");
  svg.setAttribute("aria-label", mode === "petal" ? "Petal tangent angles from base to tip" : "Radial attachment height curve");
  svg.classList.add("curve-plot");
  svg.innerHTML = '<path class="curve-grid" d="M20 20H260M20 55H260M20 90H260M20 125H260M20 20V125M100 20V125M180 20V125M260 20V125"/><path class="curve-handles"/><path class="curve-line"/>';
  element.append(svg);
  const path = svg.querySelector(".curve-line")!;
  const handles = svg.querySelector(".curve-handles")!;
  const points: SVGCircleElement[] = [];
  const min = mode === "petal" ? -Math.PI : -0.5;
  const max = mode === "petal" ? Math.PI * 2 : 2;
  const keys = (): readonly CurveKey[] => mode === "height" ? HEIGHT_KEYS : selection.value === "outer" ? OUTER_KEYS : INNER_KEYS;
  const mapY = (value: number) => 125 - (value - min) / (max - min) * 105;
  const labels = mode === "height" ? ["Center", "Inner", "Outer", "Edge"] : ["Base", "Shoulder", "Bend", "Tip"];
  let active: number | null = null;
  let signature = "";
  const write = (index: number, value: number) => {
    settings[keys()[index]!] = Math.max(min, Math.min(max, value));
    changed(); refresh();
  };
  for (let i = 0; i < 4; i++) {
    const point = document.createElementNS(NS, "circle");
    point.setAttribute("r", "6"); point.setAttribute("tabindex", "0");
    point.setAttribute("role", "slider"); point.setAttribute("aria-label", `${mode === "height" ? "Radial height" : "Petal angle"} ${labels[i]}`);
    point.setAttribute("aria-valuemin", String(min)); point.setAttribute("aria-valuemax", String(max));
    point.addEventListener("pointerdown", (event) => { active = i; svg.setPointerCapture(event.pointerId); event.preventDefault(); });
    point.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault(); event.stopPropagation();
      write(i, settings[keys()[i]!] + (["ArrowUp", "ArrowRight"].includes(event.key) ? 1 : -1) * (event.shiftKey ? 0.1 : 0.02));
    });
    svg.append(point); points.push(point);
    const label = document.createElementNS(NS, "text");
    label.setAttribute("x", String(20 + i * 80)); label.setAttribute("y", "148");
    label.setAttribute("text-anchor", i === 0 ? "start" : i === 3 ? "end" : "middle");
    label.textContent = labels[i]!; svg.append(label);
  }
  svg.addEventListener("pointermove", (event) => {
    if (active === null) return;
    const rect = svg.getBoundingClientRect();
    const y = (event.clientY - rect.top) / rect.height * 154;
    write(active, min + (125 - y) / 105 * (max - min));
  });
  const release = () => { active = null; };
  svg.addEventListener("pointerup", release); svg.addEventListener("pointercancel", release);
  const preview = document.createElementNS(NS, "svg");
  preview.setAttribute("viewBox", "0 0 280 112"); preview.classList.add("petal-preview");
  preview.innerHTML = '<path class="curve-grid" d="M20 92H260M20 92V8"/><path class="curve-line"/><text x="22" y="107">Base</text><text x="240" y="107">Tip</text>';
  if (mode === "petal") element.append(preview);
  const hint = document.createElement("p");
  hint.textContent = mode === "petal" ? "Drag the angle points. The lower drawing shows the resulting side profile." : "Drag heights from center to edge. Petal curvature stays unchanged.";
  element.append(hint);
  const reset = document.createElement("button"); reset.textContent = "Reset this curve";
  reset.addEventListener("click", () => { const defaults = shapeFor(settings.name); for (const key of keys()) settings[key] = defaults[key]; changed(); refresh(); });
  element.append(reset);
  selection.addEventListener("change", () => refresh());
  function refresh() {
    const values = keys().map((key) => settings[key]);
    const next = JSON.stringify([settings.name, selection.value, values]);
    if (signature === next) return;
    signature = next;
    path.setAttribute("d", Array.from({length: 49}, (_, i) => `${i ? "L" : "M"}${20 + i * 5},${mapY(cubic(values, i / 48))}`).join(" "));
    handles.setAttribute("d", values.map((v, i) => `${i ? "L" : "M"}${20 + i * 80},${mapY(v)}`).join(" "));
    values.forEach((v, i) => { points[i]!.setAttribute("cx", String(20 + i * 80)); points[i]!.setAttribute("cy", String(mapY(v))); points[i]!.setAttribute("aria-valuenow", String(v)); points[i]!.setAttribute("aria-valuetext", mode === "petal" ? `${Math.round(v * 180 / Math.PI)} degrees` : v.toFixed(2)); });
    if (mode === "petal") {
      const samples = Array.from({length: 33}, (_, i) => samplePetal(values, i / 32, 16));
      const rs = samples.map((s) => s[0]), ys = samples.map((s) => s[1]);
      const rMin = Math.min(0, ...rs), rMax = Math.max(0.25, ...rs), yMin = Math.min(0, ...ys), yMax = Math.max(0.25, ...ys);
      const scale = Math.min(220 / (rMax - rMin), 78 / (yMax - yMin));
      preview.querySelector(".curve-line")!.setAttribute("d", samples.map(([r,y],i) => `${i ? "L" : "M"}${25 + (r-rMin)*scale},${90-(y-yMin)*scale}`).join(" "));
    }
  }
  refresh();
  return {element, refresh};
}
