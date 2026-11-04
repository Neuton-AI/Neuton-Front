import { useEffect, useRef } from "react";
import { isApiIdentityCurrent, type AuthIdentity } from "@/lib/api-context";

/** An async page action may finish after its component or authority has gone away. */
export function useCurrentOperation(
  identity: AuthIdentity | null | undefined,
  shopId: string | null | undefined,
) {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return () => mounted.current && isApiIdentityCurrent(identity, shopId);
}
