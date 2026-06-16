import { useEffect, useMemo, useRef } from "react";

import type { GameObject, GameState } from "@ucre/core";
import {
  THEATER_ANCHOR_IDS,
  createCardTheater,
  groupTheaterActorsByAnchor,
  type CardTheater,
  type TheaterActor,
  type TheaterActorKind,
  type TheaterAnchorId,
  type TheaterRenderInput,
} from "@ucre/theater-three";
import {
  SLAY_LIKE_CARD_DEFINITIONS,
  SLAY_LIKE_ENEMY_DEFINITIONS,
  SLAY_LIKE_ZONES,
} from "@ucre/rulesets";

interface TheaterCanvasProps {
  readonly state: GameState;
}

export function TheaterCanvas({ state }: TheaterCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const theaterRef = useRef<CardTheater | null>(null);
  const renderInput = useMemo(() => createRenderInput(state), [state]);
  const renderInputRef = useRef(renderInput);

  useEffect(() => {
    renderInputRef.current = renderInput;
    theaterRef.current?.update(renderInput);
  }, [renderInput]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) {
      return undefined;
    }

    const theater = createCardTheater(canvas);
    theaterRef.current = theater;

    const resize = () => {
      const bounds = host.getBoundingClientRect();
      theater.resize(bounds.width, bounds.height);
      theater.update(renderInputRef.current);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      observer.disconnect();
      theater.dispose();
      theaterRef.current = null;
    };
  }, []);

  const actorGroups = useMemo(
    () => groupTheaterActorsByAnchor(renderInput.actors),
    [renderInput.actors],
  );

  return (
    <section className="theater-stage" aria-label="Card theater">
      <canvas ref={canvasRef} aria-label="Three.js card theater" />
      <div className="theater-overlay" aria-label="Theater counts">
        <span>Draw {actorGroups.drawPile.length}</span>
        <span>Hand {actorGroups.hand.length}</span>
        <span>Discard {actorGroups.discardPile.length}</span>
        <span>Enemy {actorGroups.enemy.length}</span>
        <button
          className="theater-skip"
          type="button"
          aria-label="Skip theater animation"
          onClick={() => theaterRef.current?.skipAnimations()}
        >
          Skip
        </button>
      </div>
    </section>
  );
}

function createRenderInput(state: GameState): TheaterRenderInput {
  return {
    actors: [
      ...createZoneActors(state, SLAY_LIKE_ZONES.drawPile, THEATER_ANCHOR_IDS.drawPile, "card"),
      ...createZoneActors(state, SLAY_LIKE_ZONES.hand, THEATER_ANCHOR_IDS.hand, "card"),
      ...createZoneActors(state, SLAY_LIKE_ZONES.playArea, THEATER_ANCHOR_IDS.playArea, "card"),
      ...createZoneActors(
        state,
        SLAY_LIKE_ZONES.discardPile,
        THEATER_ANCHOR_IDS.discardPile,
        "card",
      ),
      ...createZoneActors(state, SLAY_LIKE_ZONES.enemy, THEATER_ANCHOR_IDS.enemy, "enemy"),
      ...createZoneActors(state, SLAY_LIKE_ZONES.reward, THEATER_ANCHOR_IDS.reward, "reward"),
    ],
  };
}

function createZoneActors(
  state: GameState,
  zoneId: string,
  anchorId: TheaterAnchorId,
  kind: TheaterActorKind,
): TheaterActor[] {
  return getZoneObjects(state, zoneId).map((object) => ({
    id: object.id,
    label: formatObjectLabel(object),
    anchorId,
    kind,
  }));
}

function getZoneObjects(state: GameState, zoneId: string): GameObject[] {
  const zone = state.zones[zoneId];
  if (!zone) {
    return [];
  }

  return zone.objectIds.flatMap((objectId) => {
    const object = state.objects[objectId];
    return object ? [object] : [];
  });
}

function formatObjectLabel(object: GameObject): string {
  const cardName = SLAY_LIKE_CARD_DEFINITIONS[object.definitionId]?.name;
  if (cardName) {
    return cardName;
  }

  const enemyName = SLAY_LIKE_ENEMY_DEFINITIONS[object.definitionId]?.name;
  if (enemyName) {
    return enemyName;
  }

  return titleCaseIdentifier(object.definitionId);
}

function titleCaseIdentifier(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[._:-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => {
      const first = part[0];
      if (!first) {
        return part;
      }

      return `${first.toUpperCase()}${part.slice(1)}`;
    })
    .join(" ");
}
