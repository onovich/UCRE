export const UCRE_CORE_PACKAGE_ID = "@ucre/core";

export interface EngineIdentity {
  packageId: typeof UCRE_CORE_PACKAGE_ID;
  version: string;
}

export function createEngineIdentity(version = "0.0.0"): EngineIdentity {
  return {
    packageId: UCRE_CORE_PACKAGE_ID,
    version,
  };
}

export * from "./contracts.js";
export * from "./hash.js";
export * from "./rng.js";
