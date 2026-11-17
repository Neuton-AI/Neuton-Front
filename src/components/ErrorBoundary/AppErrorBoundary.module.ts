import { useLocation } from "react-router-dom";

export function useAppErrorBoundaryLocation() {
  const { key, pathname } = useLocation();
  return { key, pathname };
}
