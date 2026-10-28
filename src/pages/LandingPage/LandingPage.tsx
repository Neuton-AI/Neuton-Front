import { LandingCta, LandingHero } from './LandingHero/LandingHero';
import { LandingHow } from './LandingHow/LandingHow';
import { LandingFeatures } from './LandingFeatures/LandingFeatures';
import { useLandingPage } from './LandingPage.module';
import { LandingMenu, LandingNav } from './LandingNav/LandingNav';
import { LandingPreview } from './LandingPreview/LandingPreview';
import { LandingFooter, LandingPricing } from './LandingPricing/LandingPricing';

export function LandingPage() {
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
}
