import type React from "react";
import { LandingCta, LandingHero } from "./components/LandingHero/LandingHero";
import { LandingHow } from "./components/LandingHow/LandingHow";
import { LandingFeatures } from "./components/LandingFeatures/LandingFeatures";
import { useLandingPage } from "./LandingPage.module";
import { LandingMenu, LandingNav } from "./components/LandingNav/LandingNav";
import { LandingPreview } from "./components/LandingPreview/LandingPreview";
import {
  LandingFooter,
  LandingPricing,
} from "./components/LandingPricing/LandingPricing";

export const LandingPage: React.FC = () => {
  const { menuOpen, handleToggleMenu, handleCloseMenu } = useLandingPage();
  return (
    <div className="shell min-h-screen bg-surface-canvas text-ink antialiased">
      <LandingNav menuOpen={menuOpen} onToggle={handleToggleMenu} />
      {menuOpen ? <LandingMenu onNavigate={handleCloseMenu} /> : null}
      <LandingHero />
      <LandingPreview />
      <LandingHow />
      <LandingFeatures />
      <LandingPricing />
      <LandingCta />
      <LandingFooter />
    </div>
  );
};
