import { describe, expect, it } from "vitest";

import { UCRE_CORE_PACKAGE_ID, createEngineIdentity } from "./index.js";

describe("core package scaffold", () => {
  it("exposes a stable package identity", () => {
    expect(createEngineIdentity("0.1.0")).toEqual({
      packageId: UCRE_CORE_PACKAGE_ID,
      version: "0.1.0",
    });
  });
});
