import { UCRE_CONTENT_SCHEMA_PACKAGE_ID } from "@ucre/content-schema";

export interface ContentCompilerIdentity {
  schemaPackageId: typeof UCRE_CONTENT_SCHEMA_PACKAGE_ID;
}

export function createContentCompilerIdentity(): ContentCompilerIdentity {
  return {
    schemaPackageId: UCRE_CONTENT_SCHEMA_PACKAGE_ID,
  };
}
