import { useState } from "react";

export function useLandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  return {
    menuOpen,
    handleToggleMenu: () => setMenuOpen((open) => !open),
    handleCloseMenu: () => setMenuOpen(false),
  };
}
