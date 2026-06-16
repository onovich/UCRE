# ADR 0024 - Theater Card Texture Generation

Status: Accepted

Context: Phase 5 needs small 3D cards to show recognizable card, enemy, and reward faces in screenshot smoke without introducing a larger asset pipeline.

Decision: `@ucre/theater-three` generates card faces from deterministic `TheaterActor` data by first deriving a pure `TheaterCardFaceModel`, then drawing that model to an in-memory canvas and assigning it to a `THREE.CanvasTexture`. Texture signatures prevent redundant regeneration, and material disposal releases texture maps. The runtime canvas dependency stays inside the theater package.

Consequences: The browser theater can render inspectable card faces while the rules, replay, and content packages remain asset- and DOM-free. A later asset pipeline can replace the canvas drawing path behind the same actor/face model boundary.

Validation: Face model tests, focused theater/game builds, browser canvas-hash smoke, headless console smoke, mobile layout checks, canvas pixel smoke, full project validation, and architecture searches validate the boundary.
