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
