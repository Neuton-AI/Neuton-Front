import { useState } from "react";
import { useLocation } from "react-router-dom";

export function useLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { state } = useLocation();
  const returnTo = (state as { from?: string } | null)?.from;
  return {
    menuOpen,
    returnTo,
    handleToggleMenu: () => setMenuOpen((open) => !open),
    handleCloseMenu: () => setMenuOpen(false),
  };
}
