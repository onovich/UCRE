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

export interface CardTheater {
  readonly anchors: readonly TheaterAnchor[];
  resize(width: number, height: number): void;
  update(input: TheaterRenderInput): void;
  render(): void;
  dispose(): void;
}

const CARD_WIDTH = 0.44;
const CARD_HEIGHT = 0.64;

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

  scene.add(new THREE.HemisphereLight(0xfff0c8, 0x1f2724, 2.2));
  const keyLight = new THREE.DirectionalLight(0xfff1cb, 2.6);
  keyLight.position.set(-2, 5, 3);
  scene.add(keyLight);

  function render() {
    renderer.render(scene, camera);
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
      const groups = groupTheaterActorsByAnchor(input.actors);
      clearGroup(cardGroup);
      addZoneActors(cardGroup, anchors, THEATER_ANCHOR_IDS.drawPile, groups.drawPile);
      addZoneActors(cardGroup, anchors, THEATER_ANCHOR_IDS.hand, groups.hand);
      addZoneActors(cardGroup, anchors, THEATER_ANCHOR_IDS.playArea, groups.playArea);
      addZoneActors(cardGroup, anchors, THEATER_ANCHOR_IDS.discardPile, groups.discardPile);
      addZoneActors(cardGroup, anchors, THEATER_ANCHOR_IDS.enemy, groups.enemy);
      addZoneActors(cardGroup, anchors, THEATER_ANCHOR_IDS.reward, groups.reward);
      render();
    },
    render,
    dispose() {
      clearGroup(tableRoot);
      renderer.dispose();
    },
  };
}

function addZoneActors(
  group: THREE.Group,
  anchors: readonly TheaterAnchor[],
  anchorId: TheaterAnchorId,
  actors: readonly TheaterActor[],
): void {
  const anchor = anchors.find((entry) => entry.id === anchorId);
  if (!anchor) {
    return;
  }

  const count = actors.length;
  for (let index = 0; index < count; index += 1) {
    const actor = actors[index];
    if (!actor) {
      continue;
    }

    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT),
      new THREE.MeshStandardMaterial({
        color: getActorColor(actor),
        roughness: 0.72,
        metalness: 0.02,
        side: THREE.DoubleSide,
      }),
    );
    mesh.name = actor.id;
    mesh.userData = {
      actorId: actor.id,
      anchorId: actor.anchorId,
      kind: actor.kind,
      label: actor.label,
    };
    const [x, , z] = anchor.position;
    const centeredIndex = index - (count - 1) / 2;
    const handOffset = anchorId === THEATER_ANCHOR_IDS.hand ? centeredIndex * 0.52 : 0;
    const stackOffset = anchorId === THEATER_ANCHOR_IDS.hand ? 0 : index * 0.035;
    const depthOffset = anchorId === THEATER_ANCHOR_IDS.hand ? Math.abs(centeredIndex) * -0.06 : 0;
    mesh.position.set(x + handOffset + stackOffset, 0.055 + index * 0.006, z + depthOffset);
    mesh.rotation.x = -Math.PI / 2;
    mesh.rotation.z = anchorId === THEATER_ANCHOR_IDS.hand ? centeredIndex * -0.14 : 0;
    group.add(mesh);
  }
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
        material.dispose();
      }
    } else {
      object.material.dispose();
    }
  }
}
