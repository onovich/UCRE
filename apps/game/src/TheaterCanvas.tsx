import { useEffect, useMemo, useRef } from "react";

import type { GameState } from "@ucre/core";
import { createCardTheater, type CardTheater, type TheaterRenderInput } from "@ucre/theater-three";
import { SLAY_LIKE_ZONES } from "@ucre/rulesets";

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

  return (
    <section className="theater-stage" aria-label="Card theater">
      <canvas ref={canvasRef} aria-label="Three.js card theater" />
      <div className="theater-overlay" aria-label="Theater counts">
        <span>Draw {renderInput.drawPileCount}</span>
        <span>Hand {renderInput.handCount}</span>
        <span>Discard {renderInput.discardPileCount}</span>
        <span>Enemy {renderInput.enemyCount}</span>
      </div>
    </section>
  );
}

function createRenderInput(state: GameState): TheaterRenderInput {
  return {
    drawPileCount: countZoneObjects(state, SLAY_LIKE_ZONES.drawPile),
    handCount: countZoneObjects(state, SLAY_LIKE_ZONES.hand),
    playAreaCount: countZoneObjects(state, SLAY_LIKE_ZONES.playArea),
    discardPileCount: countZoneObjects(state, SLAY_LIKE_ZONES.discardPile),
    enemyCount: countZoneObjects(state, SLAY_LIKE_ZONES.enemy),
    rewardCount: countZoneObjects(state, SLAY_LIKE_ZONES.reward),
  };
}

function countZoneObjects(state: GameState, zoneId: string): number {
  return state.zones[zoneId]?.objectIds.length ?? 0;
}
