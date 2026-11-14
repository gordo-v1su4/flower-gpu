import {
  BoxGeometry,
  CatmullRomCurve3,
  CylinderGeometry,
  Euler,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshPhysicalNodeMaterial,
  QuadraticBezierCurve3,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three/webgpu";

export type PassionAnatomy = {
  group: Group;
  setBloom: (value: number) => void;
  setSway: (time: number, strength: number) => void;
  setWireframe: (enabled: boolean) => void;
};

const matrix = new Matrix4();
const quaternion = new Quaternion();
const euler = new Euler();
const position = new Vector3();
const scale = new Vector3();
const up = new Vector3(0, 1, 0);

function material(color: string, roughness = 0.58): MeshPhysicalNodeMaterial {
  return new MeshPhysicalNodeMaterial({ color, roughness, metalness: 0 });
}

function coronaRing(
  count: number,
  radius: number,
  length: number,
  lift: number,
  thickness: number,
  color: string,
  offset: number,
): { mesh: InstancedMesh; setBloom: (open: number) => void } {
  const curve = new CatmullRomCurve3(Array.from({length: 17}, (_, i) => {
    const t = i / 16;
    return new Vector3(Math.sin(t * 24) * t * t * 0.026, lift * Math.sin(t * Math.PI * 0.7) + Math.sin(t * 20) * t * t * 0.014, length * t);
  }));
  const geometry = new TubeGeometry(curve, 24, thickness, 5, false);
  const mesh = new InstancedMesh(geometry, material(color, 0.5), count);
  const setBloom = (open: number): void => {
  for (let index = 0; index < count; index += 1) {
    const angle = offset + index / count * Math.PI * 2;
    const variation = Math.sin(index * 17.17) * 0.5 + 0.5;
    const attachment = radius * (0.25 + 0.75 * open);
    position.set(Math.sin(angle) * attachment, 0.2, Math.cos(angle) * attachment);
    quaternion.setFromEuler(euler.set(-(1 - open) * 1.45, angle, 0, "YXZ"));
    scale.set(1, (0.85 + variation * 0.3) * (0.4 + open * 0.6), (0.88 + variation * 0.2) * (0.32 + open * 0.68));
    matrix.compose(position, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  };
  setBloom(1);
  mesh.frustumCulled = false;
  return {mesh, setBloom};
}

function linkedCylinder(
  start: Vector3,
  end: Vector3,
  radius: number,
  cylinderMaterial: MeshPhysicalNodeMaterial,
): Mesh {
  const direction = end.clone().sub(start);
  const mesh = new Mesh(new CylinderGeometry(radius, radius * 1.08, direction.length(), 8), cylinderMaterial);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(up, direction.normalize());
  return mesh;
}

export function createPassionAnatomy(): PassionAnatomy {
  const group = new Group();
  const corona = new Group();
  const rings = [
    coronaRing(72, 0.2, 1.02, 0.025, 0.008, "#39227f", 0),
    coronaRing(64, 0.17, 0.82, 0.1, 0.009, "#dad9ff", 0.035),
    coronaRing(56, 0.14, 0.62, 0.18, 0.01, "#7443a6", 0.07),
  ];
  corona.add(...rings.map((ring) => ring.mesh));
  group.add(corona);

  const center = new Group();
  const burgundy = material("#421630", 0.72);
  const cream = material("#d9d79a", 0.6);
  const pollen = material("#f2bf38", 0.52);
  const disk = new Mesh(new CylinderGeometry(0.24, 0.28, 0.09, 48), burgundy);
  disk.position.y = 0.1;
  center.add(disk);
  const ring = new Mesh(new TorusGeometry(0.18, 0.025, 8, 48), burgundy);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.23;
  center.add(ring);
  const stalk = new Mesh(new CylinderGeometry(0.035, 0.05, 0.48, 12), cream);
  stalk.position.y = 0.34;
  center.add(stalk);
  const ovary = new Mesh(new SphereGeometry(0.11, 20, 14), cream);
  ovary.scale.y = 1.25;
  ovary.position.y = 0.47;
  center.add(ovary);

  for (let index = 0; index < 5; index += 1) {
    const angle = index / 5 * Math.PI * 2 + 0.25;
    const start = new Vector3(Math.sin(angle) * 0.07, 0.32, Math.cos(angle) * 0.07);
    const end = new Vector3(Math.sin(angle) * 0.34, 0.36, Math.cos(angle) * 0.34);
    center.add(linkedCylinder(start, end, 0.018, cream));
    const anther = new Mesh(new BoxGeometry(0.16, 0.06, 0.075), pollen);
    anther.position.copy(end);
    anther.rotation.y = angle;
    center.add(anther);
  }
  for (let index = 0; index < 3; index += 1) {
    const angle = index / 3 * Math.PI * 2 - 0.2;
    const start = new Vector3(0, 0.49, 0);
    const end = new Vector3(Math.sin(angle) * 0.18, 0.66, Math.cos(angle) * 0.18);
    center.add(linkedCylinder(start, end, 0.014, cream));
    const stigma = new Mesh(new SphereGeometry(0.035, 12, 8), burgundy);
    stigma.position.copy(end);
    center.add(stigma);
  }
  group.add(center);

  return {
    group,
    setBloom(value) {
      const opened = Math.max(0, Math.min(1, value));
      for (const ring of rings) ring.setBloom(opened);
      center.scale.setScalar(0.12 + opened * 0.88);
      center.position.y = (1 - opened) * 0.08;
    },
    setSway(time, strength) {
      corona.rotation.z = Math.sin(time * 1.1) * strength * 0.018;
      center.rotation.z = Math.sin(time * 1.1 + 0.3) * strength * 0.025;
    },
    setWireframe(enabled) {
      group.traverse((object) => {
        if (object instanceof Mesh) {
          (object.material as MeshPhysicalNodeMaterial).wireframe = enabled;
        }
      });
    },
  };
}
