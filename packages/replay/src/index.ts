import { UCRE_CORE_PACKAGE_ID } from "@ucre/core";

export interface ReplayPackageIdentity {
  corePackageId: typeof UCRE_CORE_PACKAGE_ID;
}

export function createReplayPackageIdentity(): ReplayPackageIdentity {
  return {
    corePackageId: UCRE_CORE_PACKAGE_ID,
  };
}
