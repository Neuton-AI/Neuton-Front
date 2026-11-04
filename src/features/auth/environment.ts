import type { AuthIdentity } from "@/lib/api-context";

export const IDENTITY_MODEL = "neuton-owned-v1";
export const DOCUMENT_DATABASE = "neuton-documents-identity-v2";
export function identityPartition(
  identity: Pick<AuthIdentity, "environment" | "userId">,
): string {
  return `${IDENTITY_MODEL}:${encodeURIComponent(identity.environment)}:${identity.userId}`;
}

/** Session IDs and authority generations never become persistence identities. */
export function identityQueryKey(
  identity: AuthIdentity | null | undefined,
  domain: string,
  ...parts: unknown[]
) {
  return [
    IDENTITY_MODEL,
    identity?.environment ?? null,
    identity?.userId ?? null,
    domain,
    ...parts,
  ] as const;
}
export function sameQueryPartition(
  key: readonly unknown[] | undefined,
  identity: AuthIdentity | null | undefined,
  shopId: string | null | undefined,
) {
  return Boolean(
    identity &&
    key?.[0] === IDENTITY_MODEL &&
    key[1] === identity.environment &&
    key[2] === identity.userId &&
    key[4] === shopId,
  );
}
