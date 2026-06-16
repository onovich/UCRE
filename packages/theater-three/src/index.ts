import { UCRE_PRESENTATION_CORE_PACKAGE_ID } from "@ucre/presentation-core";
import * as THREE from "three";

export interface TheaterThreePackageIdentity {
  presentationCorePackageId: typeof UCRE_PRESENTATION_CORE_PACKAGE_ID;
}

export const THEATER_ANCHOR_IDS = {
  drawPile: "drawPile",
  hand: "hand",
  playArea: "playArea",
  discardPile: "discardPile",
  enemy: "enemy",
  reward: "reward",
} as const;

export type TheaterAnchorId = (typeof THEATER_ANCHOR_IDS)[keyof typeof THEATER_ANCHOR_IDS];

export interface TheaterAnchor {
  readonly id: TheaterAnchorId;
  readonly label: string;
  readonly position: readonly [number, number, number];
}

export type TheaterActorKind = "card" | "enemy" | "reward";

export interface TheaterActor {
  readonly id: string;
  readonly label: string;
  readonly anchorId: TheaterAnchorId;
  readonly kind: TheaterActorKind;
}

export type TheaterActorGroups = Readonly<Record<TheaterAnchorId, readonly TheaterActor[]>>;

export interface TheaterRenderInput {
  readonly actors: readonly TheaterActor[];
}

export interface TheaterActorPlacement {
  readonly actor: TheaterActor;
  readonly anchorId: TheaterAnchorId;
  readonly position: readonly [number, number, number];
  readonly rotation: readonly [number, number, number];
}

export interface TheaterCardFaceModel {
  readonly label: string;
  readonly subtitle: string;
  readonly backgroundColor: string;
  readonly accentColor: string;
  readonly textColor: string;
}

export interface CardTheater {
  readonly anchors: readonly TheaterAnchor[];
  resize(width: number, height: number): void;
  update(input: TheaterRenderInput): void;
  skipAnimations(): void;
  render(): void;
  dispose(): void;
}

const CARD_WIDTH = 0.44;
const CARD_HEIGHT = 0.64;
const CARD_TEXTURE_WIDTH = 256;
const CARD_TEXTURE_HEIGHT = 368;
const MOVE_ANIMATION_DURATION_MS = 360;
const POSITION_EPSILON = 0.001;
const ROTATION_EPSILON = 0.001;

type CardActorMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;

interface ActorAnimation {
  readonly fromPosition: THREE.Vector3;
  readonly fromRotationZ: number;
  readonly target: TheaterActorPlacement;
  startedAt?: number;
}

interface ActorMeshState {
  readonly mesh: CardActorMesh;
  target: TheaterActorPlacement;
  animation?: ActorAnimation;
}

export function createTheaterThreePackageIdentity(): TheaterThreePackageIdentity {
  return {
    presentationCorePackageId: UCRE_PRESENTATION_CORE_PACKAGE_ID,
  };
}

export function createTheaterAnchorLayout(): readonly TheaterAnchor[] {
  return [
    {
      id: THEATER_ANCHOR_IDS.drawPile,
      label: "Draw",
      position: [-3.1, 0, 0.35],
    },
    {
      id: THEATER_ANCHOR_IDS.hand,
      label: "Hand",
      position: [0, 0, 1.65],
    },
    {
      id: THEATER_ANCHOR_IDS.playArea,
      label: "Play",
      position: [0, 0, 0],
    },
    {
      id: THEATER_ANCHOR_IDS.discardPile,
      label: "Discard",
      position: [3.1, 0, 0.35],
    },
    {
      id: THEATER_ANCHOR_IDS.enemy,
      label: "Enemy",
      position: [0, 0, -1.75],
    },
    {
      id: THEATER_ANCHOR_IDS.reward,
      label: "Reward",
      position: [3.1, 0, -1.75],
    },
  ];
}

export function groupTheaterActorsByAnchor(actors: readonly TheaterActor[]): TheaterActorGroups {
  const groups: Record<TheaterAnchorId, TheaterActor[]> = {
    [THEATER_ANCHOR_IDS.drawPile]: [],
    [THEATER_ANCHOR_IDS.hand]: [],
    [THEATER_ANCHOR_IDS.playArea]: [],
    [THEATER_ANCHOR_IDS.discardPile]: [],
    [THEATER_ANCHOR_IDS.enemy]: [],
    [THEATER_ANCHOR_IDS.reward]: [],
  };

  for (const actor of actors) {
    groups[actor.anchorId].push(actor);
  }

  return groups;
}

export function createTheaterActorPlacements(
  actors: readonly TheaterActor[],
  anchors: readonly TheaterAnchor[] = createTheaterAnchorLayout(),
): readonly TheaterActorPlacement[] {
  const groups = groupTheaterActorsByAnchor(actors);
  const placements: TheaterActorPlacement[] = [];

  for (const anchor of anchors) {
    const zoneActors = groups[anchor.id];
    for (let index = 0; index < zoneActors.length; index += 1) {
      const actor = zoneActors[index];
      if (actor) {
        placements.push(createTheaterActorPlacement(anchor, actor, index, zoneActors.length));
      }
    }
  }

  return placements;
}

export function createTheaterCardFaceModel(actor: TheaterActor): TheaterCardFaceModel {
  if (actor.kind === "enemy") {
    return {
      label: actor.label,
      subtitle: "Enemy",
      backgroundColor: "#3a1f19",
      accentColor: toCssHexColor(getActorColor(actor)),
      textColor: "#fff1e8",
    };
  }

  if (actor.kind === "reward") {
    return {
      label: actor.label,
      subtitle: "Reward",
      backgroundColor: "#17312a",
      accentColor: toCssHexColor(getActorColor(actor)),
      textColor: "#f7fff9",
    };
  }

  return {
    label: actor.label,
    subtitle: getAnchorSubtitle(actor.anchorId),
    backgroundColor: "#f1eee6",
    accentColor: toCssHexColor(
      actor.anchorId === THEATER_ANCHOR_IDS.hand ? 0x4a6e5d : getActorColor(actor),
    ),
    textColor: "#171611",
  };
}

export function createCardTheater(canvas: HTMLCanvasElement): CardTheater {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    canvas,
    preserveDrawingBuffer: true,
  });
  renderer.setClearColor(0x11100d, 1);
  renderer.setPixelRatio(1.5);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x11100d);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 4.6, 4.9);
  camera.lookAt(0, 0, 0);

  const tableRoot = new THREE.Group();
  scene.add(tableRoot);

  const table = new THREE.Mesh(
    new THREE.PlaneGeometry(7.8, 5.1),
    new THREE.MeshStandardMaterial({
      color: 0x242019,
      roughness: 0.78,
      metalness: 0.05,
      side: THREE.DoubleSide,
    }),
  );
  table.rotation.x = -Math.PI / 2;
  tableRoot.add(table);

  const anchors = createTheaterAnchorLayout();
  const anchorGroup = new THREE.Group();
  tableRoot.add(anchorGroup);

  for (const anchor of anchors) {
    const marker = new THREE.Mesh(
      new THREE.CircleGeometry(0.42, 36),
      new THREE.MeshStandardMaterial({
        color: anchor.id === THEATER_ANCHOR_IDS.enemy ? 0x7f4c3c : 0x4a6e5d,
        roughness: 0.85,
        side: THREE.DoubleSide,
      }),
    );
    marker.position.set(anchor.position[0], 0.014, anchor.position[2]);
    marker.rotation.x = -Math.PI / 2;
    anchorGroup.add(marker);
  }

  const cardGroup = new THREE.Group();
  tableRoot.add(cardGroup);
  const actorMeshStates = new Map<string, ActorMeshState>();
  let animationFrameId: number | undefined;

  scene.add(new THREE.HemisphereLight(0xfff0c8, 0x1f2724, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff1cb, 2.6);
  keyLight.position.set(-2, 5, 3);
  scene.add(keyLight);

  function render() {
    renderer.render(scene, camera);
  }

  function requestAnimationLoop() {
    if (animationFrameId !== undefined) {
      return;
    }

    animationFrameId = requestAnimationFrame(stepAnimations);
  }

  function cancelAnimationLoop() {
    if (animationFrameId === undefined) {
      return;
    }

    cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }

  function stepAnimations(timestamp: number) {
    animationFrameId = undefined;
    let shouldContinue = false;

    for (const meshState of actorMeshStates.values()) {
      const animation = meshState.animation;
      if (!animation) {
        continue;
      }

      if (animation.startedAt === undefined) {
        animation.startedAt = timestamp;
      }

      const progress = Math.min(1, (timestamp - animation.startedAt) / MOVE_ANIMATION_DURATION_MS);
      const easedProgress = easeOutCubic(progress);
      applyInterpolatedPlacement(meshState.mesh, animation, easedProgress);

      if (progress >= 1) {
        meshState.target = animation.target;
        setMeshPlacement(meshState.mesh, animation.target);
        delete meshState.animation;
      } else {
        shouldContinue = true;
      }
    }

    render();

    if (shouldContinue) {
      requestAnimationLoop();
    }
  }

  return {
    anchors,
    resize(width, height) {
      const safeWidth = Math.max(1, width);
      const safeHeight = Math.max(1, height);
      renderer.setSize(safeWidth, safeHeight, false);
      camera.aspect = safeWidth / safeHeight;
      camera.updateProjectionMatrix();
      render();
    },
    update(input) {
      const placements = createTheaterActorPlacements(input.actors, anchors);
      const activeActorIds = new Set(placements.map((placement) => placement.actor.id));
      let hasActiveAnimation = false;

      for (const [actorId, meshState] of actorMeshStates) {
        if (!activeActorIds.has(actorId)) {
          cardGroup.remove(meshState.mesh);
          disposeObject(meshState.mesh);
          actorMeshStates.delete(actorId);
        }
      }

      for (const placement of placements) {
        const meshState = actorMeshStates.get(placement.actor.id);
        if (!meshState) {
          const mesh = createActorMesh(placement.actor);
          setMeshPlacement(mesh, placement);
          cardGroup.add(mesh);
          actorMeshStates.set(placement.actor.id, {
            mesh,
            target: placement,
          });
          continue;
        }

        updateActorMeshMetadata(meshState.mesh, placement.actor);
        meshState.target = placement;

        if (hasMeshPlacementChanged(meshState.mesh, placement)) {
          meshState.animation = {
            fromPosition: meshState.mesh.position.clone(),
            fromRotationZ: meshState.mesh.rotation.z,
            target: placement,
          };
          hasActiveAnimation = true;
        } else {
          setMeshPlacement(meshState.mesh, placement);
          delete meshState.animation;
        }
      }

      if (hasActiveAnimation) {
        requestAnimationLoop();
      }

      render();
    },
    skipAnimations() {
      cancelAnimationLoop();

      for (const meshState of actorMeshStates.values()) {
        setMeshPlacement(meshState.mesh, meshState.target);
        delete meshState.animation;
      }

      render();
    },
    render,
    dispose() {
      cancelAnimationLoop();
      actorMeshStates.clear();
      clearGroup(tableRoot);
      renderer.dispose();
    },
  };
}

function createTheaterActorPlacement(
  anchor: TheaterAnchor,
  actor: TheaterActor,
  index: number,
  count: number,
): TheaterActorPlacement {
  const [x, , z] = anchor.position;
  const centeredIndex = index - (count - 1) / 2;
  const isHand = anchor.id === THEATER_ANCHOR_IDS.hand;
  const handOffset = isHand ? centeredIndex * 0.52 : 0;
  const stackOffset = isHand ? 0 : index * 0.035;
  const depthOffset = isHand ? Math.abs(centeredIndex) * -0.06 : 0;

  return {
    actor,
    anchorId: anchor.id,
    position: [x + handOffset + stackOffset, 0.055 + index * 0.006, z + depthOffset],
    rotation: [-Math.PI / 2, 0, isHand ? centeredIndex * -0.14 : 0],
  };
}

function createActorMesh(actor: TheaterActor): CardActorMesh {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
    new THREE.MeshStandardMaterial({
      color: getActorColor(actor),
      roughness: 0.72,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  updateActorMeshMetadata(mesh, actor);
  return mesh;
}

function updateActorMeshMetadata(mesh: CardActorMesh, actor: TheaterActor): void {
  mesh.name = actor.id;
  mesh.userData.actorId = actor.id;
  mesh.userData.anchorId = actor.anchorId;
  mesh.userData.kind = actor.kind;
  mesh.userData.label = actor.label;
  const textureSignature = getActorTextureSignature(actor);
  if (mesh.userData.textureSignature !== textureSignature) {
    mesh.material.map?.dispose();
    mesh.material.map = createActorTexture(actor) ?? null;
    mesh.material.color.setHex(mesh.material.map ? 0xffffff : getActorColor(actor));
    mesh.material.needsUpdate = true;
    mesh.userData.textureSignature = textureSignature;
  }
}

function createActorTexture(actor: TheaterActor): THREE.CanvasTexture | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }

  const canvas = document.createElement("canvas");
  canvas.width = CARD_TEXTURE_WIDTH;
  canvas.height = CARD_TEXTURE_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) {
    return undefined;
  }

  drawCardFace(context, createTheaterCardFaceModel(actor));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.flipY = false;
  texture.premultiplyAlpha = false;
  texture.anisotropy = 4;
  return texture;
}

function drawCardFace(context: CanvasRenderingContext2D, face: TheaterCardFaceModel): void {
  context.fillStyle = face.backgroundColor;
  context.fillRect(0, 0, CARD_TEXTURE_WIDTH, CARD_TEXTURE_HEIGHT);

  context.strokeStyle = face.accentColor;
  context.lineWidth = 14;
  context.strokeRect(7, 7, CARD_TEXTURE_WIDTH - 14, CARD_TEXTURE_HEIGHT - 14);

  context.fillStyle = face.accentColor;
  context.fillRect(24, 26, CARD_TEXTURE_WIDTH - 48, 54);

  context.fillStyle = face.textColor;
  context.font = "700 26px Arial, sans-serif";
  context.textBaseline = "middle";
  context.fillText(face.subtitle, 36, 53, CARD_TEXTURE_WIDTH - 72);

  context.font = "800 34px Arial, sans-serif";
  context.textBaseline = "top";
  drawWrappedText(context, face.label, 32, 118, CARD_TEXTURE_WIDTH - 64, 40, 4);

  context.fillStyle = face.accentColor;
  context.fillRect(40, CARD_TEXTURE_HEIGHT - 68, CARD_TEXTURE_WIDTH - 80, 6);
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number,
): void {
  const words = text.trim().split(/\s+/);
  let line = "";
  let lineIndex = 0;

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
      continue;
    }

    if (line) {
      context.fillText(line, x, y + lineIndex * lineHeight, maxWidth);
      lineIndex += 1;
    }

    line = word;
    if (lineIndex >= maxLines - 1) {
      break;
    }
  }

  if (lineIndex < maxLines && line) {
    context.fillText(line, x, y + lineIndex * lineHeight, maxWidth);
  }
}

function getActorTextureSignature(actor: TheaterActor): string {
  const face = createTheaterCardFaceModel(actor);
  return [face.label, face.subtitle, face.backgroundColor, face.accentColor, face.textColor].join(
    "|",
  );
}

function hasMeshPlacementChanged(mesh: CardActorMesh, placement: TheaterActorPlacement): boolean {
  const [targetX, targetY, targetZ] = placement.position;
  return (
    Math.abs(mesh.position.x - targetX) > POSITION_EPSILON ||
    Math.abs(mesh.position.y - targetY) > POSITION_EPSILON ||
    Math.abs(mesh.position.z - targetZ) > POSITION_EPSILON ||
    Math.abs(mesh.rotation.z - placement.rotation[2]) > ROTATION_EPSILON
  );
}

function setMeshPlacement(mesh: CardActorMesh, placement: TheaterActorPlacement): void {
  const [x, y, z] = placement.position;
  const [rotationX, rotationY, rotationZ] = placement.rotation;
  mesh.position.set(x, y, z);
  mesh.rotation.set(rotationX, rotationY, rotationZ);
}

function applyInterpolatedPlacement(
  mesh: CardActorMesh,
  animation: ActorAnimation,
  progress: number,
): void {
  const [targetX, targetY, targetZ] = animation.target.position;
  mesh.position.set(
    lerp(animation.fromPosition.x, targetX, progress),
    lerp(animation.fromPosition.y, targetY, progress),
    lerp(animation.fromPosition.z, targetZ, progress),
  );
  mesh.rotation.x = animation.target.rotation[0];
  mesh.rotation.y = animation.target.rotation[1];
  mesh.rotation.z = lerp(animation.fromRotationZ, animation.target.rotation[2], progress);
}

function easeOutCubic(progress: number): number {
  return 1 - (1 - progress) ** 3;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function getActorColor(actor: TheaterActor): number {
  if (actor.kind === "enemy") {
    return 0xd67d63;
  }

  if (actor.kind === "reward") {
    return 0x5fc19e;
  }

  if (actor.anchorId === THEATER_ANCHOR_IDS.drawPile) {
    return 0xd5c26a;
  }

  if (actor.anchorId === THEATER_ANCHOR_IDS.hand) {
    return 0xf1eee6;
  }

  if (actor.anchorId === THEATER_ANCHOR_IDS.playArea) {
    return 0x7fb79b;
  }

  if (actor.anchorId === THEATER_ANCHOR_IDS.discardPile) {
    return 0x9c8e78;
  }

  return 0xf1eee6;
}

function getAnchorSubtitle(anchorId: TheaterAnchorId): string {
  if (anchorId === THEATER_ANCHOR_IDS.drawPile) {
    return "Draw";
  }

  if (anchorId === THEATER_ANCHOR_IDS.hand) {
    return "Hand";
  }

  if (anchorId === THEATER_ANCHOR_IDS.playArea) {
    return "Play";
  }

  if (anchorId === THEATER_ANCHOR_IDS.discardPile) {
    return "Discard";
  }

  if (anchorId === THEATER_ANCHOR_IDS.reward) {
    return "Reward";
  }

  return "Card";
}

function toCssHexColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function clearGroup(group: THREE.Group): void {
  for (const child of [...group.children]) {
    group.remove(child);
    disposeObject(child);
  }
}

function disposeObject(object: THREE.Object3D): void {
  for (const child of [...object.children]) {
    object.remove(child);
    disposeObject(child);
  }

  if (object instanceof THREE.Mesh) {
    object.geometry.dispose();

    if (Array.isArray(object.material)) {
      for (const material of object.material) {
        disposeMaterial(material);
      }
    } else {
      disposeMaterial(object.material);
    }
  }
}

function disposeMaterial(material: THREE.Material): void {
  if (material instanceof THREE.MeshStandardMaterial) {
    material.map?.dispose();
  }

  material.dispose();
}
