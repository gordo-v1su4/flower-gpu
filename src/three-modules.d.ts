declare module "three/webgpu" {
  export class Color {
    constructor(color?: string | number);
    set(color: string | number): this;
    lerp(color: Color, alpha: number): this;
    getHexString(): string;
  }

  export class Vector3 {
    set(x: number, y: number, z: number): this;
    setScalar(value: number): this;
  }

  export class Euler {
    set(x: number, y: number, z: number): this;
  }

  export class Quaternion {
    setFromEuler(euler: Euler): this;
  }

  export class Matrix4 {
    compose(position: Vector3, quaternion: Quaternion, scale: Vector3): this;
  }

  export class BufferGeometry {
    setAttribute(name: string, attribute: Float32BufferAttribute): this;
    setIndex(index: number[]): this;
    computeVertexNormals(): void;
    dispose(): void;
  }

  export class Float32BufferAttribute {
    constructor(array: number[], itemSize: number);
  }

  export class Group {
    constructor();
    rotation: { x: number; y: number; z: number };
    add(object: unknown): this;
  }

  export class MeshPhysicalNodeMaterial {
    positionNode: unknown;
    normalNode: unknown;
    colorNode: unknown;
    emissiveNode: unknown;
    roughnessNode: unknown;
    metalnessNode: unknown;
    iorNode: unknown;
    transmission: number;
    thickness: number;
    transmissionNode: unknown;
    thicknessNode: unknown;
    iridescenceNode: unknown;
    sheenNode: unknown;
    sheenRoughnessNode: unknown;
    sheenColorNode: unknown;
    clearcoatNode: unknown;
    clearcoatRoughnessNode: unknown;
    attenuationDistance: number;
    attenuationColor: Color;
    iridescenceIOR: number;
    iridescenceThicknessRange: [number, number];
    side: number;
    wireframe: boolean;
  }

  export class InstancedMesh {
    constructor(geometry: BufferGeometry, material: MeshPhysicalNodeMaterial, count: number);
    geometry: BufferGeometry;
    count: number;
    frustumCulled: boolean;
    castShadow: boolean;
    receiveShadow: boolean;
    instanceMatrix: { needsUpdate: boolean; array: ArrayLike<number> };
    setMatrixAt(index: number, matrix: Matrix4): void;
  }

  export class Scene {
    background: Color | null;
    environment: unknown;
    environmentIntensity: number;
    add(object: unknown): this;
  }

  export class PerspectiveCamera {
    constructor(fov: number, aspect: number, near: number, far: number);
    aspect: number;
    position: { set(x: number, y: number, z: number): void };
    updateProjectionMatrix(): void;
  }

  export class OrthographicCamera {
    constructor(left: number, right: number, top: number, bottom: number, near: number, far: number);
    left: number;
    right: number;
    top: number;
    bottom: number;
    position: { set(x: number, y: number, z: number): void };
    lookAt(x: number, y: number, z: number): void;
    updateProjectionMatrix(): void;
  }

  export class HemisphereLight {
    constructor(sky: number, ground: number, intensity?: number);
  }

  export class DirectionalLight {
    constructor(color: number, intensity?: number);
    color: Color;
    position: { set(x: number, y: number, z: number): void };
    castShadow: boolean;
    shadow: {
      mapSize: { set(width: number, height: number): void };
      camera: {
        near: number;
        far: number;
        left: number;
        right: number;
        top: number;
        bottom: number;
      };
      bias: number;
      normalBias: number;
    };
  }

  export class WebGPURenderer {
    constructor(parameters?: { canvas?: HTMLCanvasElement; antialias?: boolean });
    setPixelRatio(value: number): void;
    setSize(width: number, height: number): void;
    setAnimationLoop(callback: ((time: number) => void) | null): void;
    render(scene: Scene, camera: PerspectiveCamera | OrthographicCamera): void;
    init(): Promise<void>;
  }

  export class PMREMGenerator {
    constructor(renderer: WebGPURenderer);
    fromScene(scene: unknown, sigma?: number): { texture: unknown };
    fromEquirectangular(texture: { dispose(): void }): { texture: unknown };
    dispose(): void;
  }

  export const DoubleSide: number;
  export const MathUtils: {
    lerp(start: number, end: number, t: number): number;
    smoothstep(x: number, min: number, max: number): number;
  };
}

declare module "three/tsl" {
  type Tsl = any;
  export function Fn(fn: Tsl): Tsl;
  export function uniform(value: unknown): Tsl;
  export function float(value: number): Tsl;
  export const frontFacing: Tsl;
  export function vec3(...args: unknown[]): Tsl;
  export function uv(): Tsl;
  export function varying(value: unknown): Tsl;
  export const positionGeometry: Tsl;
  export const positionLocal: Tsl;
  export const normalLocal: Tsl;
  export const instanceIndex: Tsl;
  export function abs(value: unknown): Tsl;
  export function sin(value: unknown): Tsl;
  export function cos(value: unknown): Tsl;
  export function pow(value: unknown, power: unknown): Tsl;
  export function mix(a: unknown, b: unknown, t: unknown): Tsl;
  export function smoothstep(edge0: unknown, edge1: unknown, x: unknown): Tsl;
  export function clamp(value: unknown, min: unknown, max: unknown): Tsl;
  export function max(a: unknown, b: unknown): Tsl;
  export function dot(a: unknown, b: unknown): Tsl;
  export function cross(a: unknown, b: unknown): Tsl;
  export function dFdx(value: unknown): Tsl;
  export function dFdy(value: unknown): Tsl;
  export function exp(value: unknown): Tsl;
  export function buffer(value: unknown, bufferType: string, bufferCount?: number): Tsl;
  export function mat4(...args: unknown[]): Tsl;
  export function instancedDynamicBufferAttribute(array: unknown, type?: string | null, stride?: number, offset?: number): Tsl;
  export function transformNormal(normal: unknown, matrix?: unknown): Tsl;
  export function transformNormalToView(normal: unknown): Tsl;
  export function directionToFaceDirection(direction: unknown): Tsl;
  export const positionView: Tsl;
  export const normalView: Tsl;
  export const positionViewDirection: Tsl;
  export const normalWorld: Tsl;
}

declare module "three/addons/loaders/RGBELoader.js" {
  export class RGBELoader {
    loadAsync(url: string): Promise<{ dispose(): void }>;
  }
}

declare module "three/addons/environments/RoomEnvironment.js" {
  export class RoomEnvironment {
    constructor();
  }
}

declare module "three/addons/controls/OrbitControls.js" {
  export class OrbitControls {
    constructor(camera: unknown, element?: HTMLElement);
    enableDamping: boolean;
    dampingFactor: number;
    autoRotate: boolean;
    target: { set(x: number, y: number, z: number): void };
    update(): void;
  }
}
