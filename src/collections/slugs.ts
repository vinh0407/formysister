import type { CollectionSlug } from 'payload'

/**
 * Bridge for `relationTo` while `src/payload-types.ts` is stale.
 *
 * The generated types in this workspace predate the study collections because
 * Payload's CLI cannot resolve `FIGMA_EID` outside the Make lifecycle. The
 * runtime config is correct; this helper keeps collection configs compiling
 * until the platform regenerates types on the next dev/build. The double cast
 * remains valid after regeneration because the slug is then a real member of
 * `CollectionSlug`.
 */
export function collectionSlug(slug: string): CollectionSlug {
  return slug as unknown as CollectionSlug
}
