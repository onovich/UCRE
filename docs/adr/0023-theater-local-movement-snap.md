# ADR 0023 - Theater Local Movement Snap

Status: Accepted

Context: Phase 5 needs visible card movement between anchors before the full presentation director exists. The theater can animate draw-to-hand and hand-to-discard movement using actor IDs, but this timing must not affect rule state or replay hashes.

Decision: `@ucre/theater-three` owns a local actor mesh pool and a `requestAnimationFrame` movement loop. `CardTheater.update` receives the rule-correct final actor anchors, animates existing meshes toward their new placements, and creates new actors already snapped to their target. `CardTheater.skipAnimations` cancels local animation and snaps every mesh to its latest target. The React app exposes skip as a theater-only control and does not mutate `GameState`.

Consequences: Phase 5 can verify basic movement and skip behavior without introducing Phase 6 presentation director contracts early. Animation timing remains presentation-local; deterministic packages still avoid frame timing, DOM, Three.js, and browser APIs.

Validation: Theater placement tests, focused theater/game builds, browser Draw/Strike/Skip smoke, headless console smoke, mobile layout checks, canvas pixel smoke, full project validation, and architecture searches validate the boundary.
