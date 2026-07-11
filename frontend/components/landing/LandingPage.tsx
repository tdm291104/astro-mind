import { FAQSection } from "./FAQSection";
import { FeatureShowcase } from "./FeatureShowcase";
import { FooterSection } from "./FooterSection";
import { HeroSection } from "./HeroSection";
import { HowItWorks } from "./HowItWorks";
import { InteractiveDemo } from "./InteractiveDemo";
import { NavBar } from "./NavBar";
import { NewsletterSection } from "./NewsletterSection";
import { PricingSection } from "./PricingSection";
import { Starfield } from "./Starfield";

export function LandingPage() {
  return (
    <div
      className="landing"
      style={{
        background: "var(--ld-bg-deep)",
        color: "var(--ld-text-primary)",
        fontFamily: "var(--ld-font-sans)",
        minHeight: "100vh",
        overflowX: "hidden",
      }}
    >
      <Starfield />
      <div style={{ position: "relative", zIndex: 1 }}>
        <NavBar />
        <HeroSection />
        <FeatureShowcase />
        <InteractiveDemo />
        <HowItWorks />
        <PricingSection />
        <FAQSection />
        <NewsletterSection />
        <FooterSection />
      </div>
    </div>
  );
}
