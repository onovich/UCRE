import { UCRE_PRESENTATION_CORE_PACKAGE_ID } from "@ucre/presentation-core";

export interface TheaterThreePackageIdentity {
  presentationCorePackageId: typeof UCRE_PRESENTATION_CORE_PACKAGE_ID;
}

export function createTheaterThreePackageIdentity(): TheaterThreePackageIdentity {
  return {
    presentationCorePackageId: UCRE_PRESENTATION_CORE_PACKAGE_ID,
  };
}
