import { Dexie, type Table } from "dexie";

import type { RunId, RunSavePackage } from "@ucre/run";
import { verifyRunSavePackage } from "@ucre/run";

export const UCRE_RUN_DEXIE_PACKAGE_ID = "@ucre/run-dexie";
export const DEFAULT_RUN_SAVE_DATABASE_NAME = "ucre-run-saves";

export interface PersistedRunSaveRecord {
  readonly id: string;
  readonly runId: RunId;
  readonly saveHash: string;
  readonly updatedAtSequence: number;
  readonly savePackage: RunSavePackage;
}

export interface RunSaveDexieStore {
  readonly database: RunSaveDexieDatabase;
  readonly putSave: (
    savePackage: RunSavePackage,
    updatedAtSequence: number,
  ) => Promise<PersistedRunSaveRecord>;
  readonly getSave: (id: string) => Promise<RunSavePackage | undefined>;
  readonly listSaves: (runId?: RunId) => Promise<readonly RunSavePackage[]>;
  readonly deleteSave: (id: string) => Promise<void>;
  readonly close: () => void;
}

export interface CreateRunSaveDexieStoreInput {
  readonly databaseName?: string;
  readonly database?: RunSaveDexieDatabase;
}

export interface RunDexiePackageIdentity {
  readonly packageId: typeof UCRE_RUN_DEXIE_PACKAGE_ID;
}

export class RunSaveDexieDatabase extends Dexie {
  readonly saves!: Table<PersistedRunSaveRecord, string>;

  constructor(databaseName = DEFAULT_RUN_SAVE_DATABASE_NAME) {
    super(databaseName);
    this.version(1).stores({
      saves: "&id, runId, saveHash, updatedAtSequence",
    });
  }
}

export function createRunDexiePackageIdentity(): RunDexiePackageIdentity {
  return {
    packageId: UCRE_RUN_DEXIE_PACKAGE_ID,
  };
}

export function createRunSaveDexieStore(
  input: CreateRunSaveDexieStoreInput = {},
): RunSaveDexieStore {
  const database = input.database ?? new RunSaveDexieDatabase(input.databaseName);

  return {
    database,
    putSave: async (savePackage, updatedAtSequence) => {
      if (!verifyRunSavePackage(savePackage)) {
        throw new Error(`Cannot persist invalid run save package: ${savePackage.id}`);
      }

      const record: PersistedRunSaveRecord = {
        id: savePackage.id,
        runId: savePackage.runId,
        saveHash: savePackage.saveHash,
        updatedAtSequence,
        savePackage,
      };

      await database.saves.put(record);
      return record;
    },
    getSave: async (id) => {
      const record = await database.saves.get(id);
      return record?.savePackage;
    },
    listSaves: async (runId) => {
      const records =
        runId === undefined
          ? await database.saves.orderBy("updatedAtSequence").toArray()
          : await database.saves.where("runId").equals(runId).sortBy("updatedAtSequence");
      return records.map((record) => record.savePackage);
    },
    deleteSave: async (id) => {
      await database.saves.delete(id);
    },
    close: () => {
      database.close();
    },
  };
}

export async function deleteRunSaveDexieDatabase(databaseName: string): Promise<void> {
  await Dexie.delete(databaseName);
}
