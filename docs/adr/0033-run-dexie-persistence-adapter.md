# ADR 0033 - Run Dexie Persistence Adapter

Status: Accepted

Context: Phase 7 requires local browser persistence for run save packages. IndexedDB is browser-specific and should not enter deterministic run, rules, replay, or content packages.

Decision: Add `@ucre/run-dexie` as the only Dexie adapter for run save persistence. The adapter stores verified `RunSavePackage` records, indexes them by save id, run id, save hash, and an explicit update sequence supplied by the caller.

Consequences: Browser and Electron clients can persist saves through Dexie while `@ucre/run` remains a pure serializable contract package. Tests can use fake-indexeddb to exercise real Dexie operations without requiring a browser window.

Validation: Run-dexie fake-indexeddb smoke tests, package build, full project validation, and architecture searches validate the boundary.
