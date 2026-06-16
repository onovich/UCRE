import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  createLinearRunMap,
  createRunSavePackage,
  createRunSaveSnapshot,
  createRunState,
} from "@ucre/run";

import {
  createRunDexiePackageIdentity,
  createRunSaveDexieStore,
  deleteRunSaveDexieDatabase,
} from "./index.js";

const DATABASE_NAME = "ucre-run-dexie-test";

describe("run Dexie persistence", () => {
  beforeEach(async () => {
    await deleteRunSaveDexieDatabase(DATABASE_NAME);
  });

  afterEach(async () => {
    await deleteRunSaveDexieDatabase(DATABASE_NAME);
  });

  it("persists, lists, reads, and deletes verified run save packages", async () => {
    const store = createRunSaveDexieStore({
      databaseName: DATABASE_NAME,
    });
    const savePackage = createTestSavePackage("save-1", "run-1");

    try {
      const record = await store.putSave(savePackage, 1);
      const listed = await store.listSaves("run-1");
      const loaded = await store.getSave("save-1");

      expect(createRunDexiePackageIdentity().packageId).toBe("@ucre/run-dexie");
      expect(record).toMatchObject({
        id: "save-1",
        runId: "run-1",
        saveHash: savePackage.saveHash,
        updatedAtSequence: 1,
      });
      expect(listed).toEqual([savePackage]);
      expect(loaded).toEqual(savePackage);

      await store.deleteSave("save-1");
      expect(await store.getSave("save-1")).toBeUndefined();
    } finally {
      store.close();
    }
  });

  it("orders saves by explicit update sequence and rejects invalid hashes", async () => {
    const store = createRunSaveDexieStore({
      databaseName: DATABASE_NAME,
    });
    const first = createTestSavePackage("save-1", "run-1");
    const second = createTestSavePackage("save-2", "run-1");

    try {
      await store.putSave(second, 2);
      await store.putSave(first, 1);

      expect((await store.listSaves()).map((savePackage) => savePackage.id)).toEqual([
        "save-1",
        "save-2",
      ]);
      await expect(
        store.putSave(
          {
            ...first,
            payload: {
              slot: "tampered",
            },
          },
          3,
        ),
      ).rejects.toThrow("Cannot persist invalid run save package: save-1");
    } finally {
      store.close();
    }
  });
});

function createTestSavePackage(id: string, runId: string) {
  const map = createLinearRunMap({
    id: `${runId}:act-1`,
    seed: "run-seed-1",
    nodeKinds: ["start", "encounter"],
  });
  const runState = createRunState({
    id: runId,
    seed: "run-seed-1",
    rulesetId: "slay-like",
    rulesVersion: "0.0.0",
    contentManifestHash: "ucre1-content",
    map,
  });
  const commandLog = [
    {
      id: `${id}:cmd-1`,
      type: "slay.drawCards",
      playerId: "player-1",
      payload: {
        count: 5,
      },
    },
  ];
  const snapshot = createRunSaveSnapshot({
    id: `${id}:snapshot-1`,
    label: "Initial",
    runState,
    commandLog,
  });

  return createRunSavePackage({
    id,
    runState,
    commandLog,
    snapshots: [snapshot],
  });
}
