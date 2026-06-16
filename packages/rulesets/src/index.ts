import { UCRE_CORE_PACKAGE_ID } from "@ucre/core";

export interface RulesetsPackageIdentity {
  corePackageId: typeof UCRE_CORE_PACKAGE_ID;
}

export function createRulesetsPackageIdentity(): RulesetsPackageIdentity {
  return {
    corePackageId: UCRE_CORE_PACKAGE_ID,
  };
}

export * from "./slay-like.js";
export * from "./blackjack-like.js";
export * from "./sacrifice-board.js";
