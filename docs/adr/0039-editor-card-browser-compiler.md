# ADR 0039: Editor Card Browser Compiler

Status: Accepted

Context: Phase 9 starts the content editor. The editor must compile draft card content in the browser without pulling Node-only file loading into Vite bundles, and it must reuse the shared content compiler instead of duplicating validation rules in React state.

Decision: Split `@ucre/content-compiler` into a browser-safe pure compiler module and the existing Node file-loader entry. The package now exports `@ucre/content-compiler/browser` for editor usage, while `loadContentManifestFile` and extension inference remain on the main Node-oriented entry. The editor builds draft cards into a normal `ContentManifest`, calls the browser compiler, and renders the resulting hash, canonical JSON, or compiler errors.

Consequences: Designer tools can create and validate card content with the same schema, cross-reference, canonicalization, and hashing path as CLI linting. Browser clients do not import `node:fs` or `node:path`, and future editor panels can share the same draft-to-manifest pattern.

Validation: Focused content compiler and card editor model tests cover the new entry and duplicate-ID errors. The editor Vite build proves the browser bundle excludes Node file APIs. Playwright smoke verifies creating a card, surfacing and repairing a schema error, clean console output, and no mobile overflow.
