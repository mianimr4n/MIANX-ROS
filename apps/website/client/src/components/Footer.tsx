/* Flame & Crust Design: Bold street-food energy with Telepizza Red accent.
   Footer updated with multi-branch support and platform-level branding. */
import { Link } from "wouter";
import { MapPin, Phone, Instagram, Facebook, MessageCircle, Heart, Zap, Construction } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { useBranch } from "@/contexts/BranchContext";
import { BrandLogo } from "@/components/BrandLogo";

export default function Footer() {
  const { selectedBranch, allBranches } = useBranch();
  const operatingBranches = allBranches.filter((branch) => branch.status === "operating");
  const comingSoonBranches = allBranches.filter((branch) => branch.status === "coming-soon");

  return (
    <footer className="bg-brand-charcoal text-white">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div>
            <BrandLogo showRegion imageClassName="h-9 w-9" />
            <p className="text-white/50 text-sm leading-relaxed max-w-xs mt-4">
              {BRAND.tagline}. Pakistan&apos;s boldest pizza experience — fresh dough, premium toppings,
              and flavors that fire up your craving.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-wider text-brand-gold mb-4">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-3">
              <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors">
                Home
              </Link>
              <Link href="/menu" className="text-white/60 hover:text-white text-sm transition-colors">
                Full Menu
              </Link>
              <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors">
                About Us
              </Link>
              <Link href="/contact" className="text-white/60 hover:text-white text-sm transition-colors">
                Contact
              </Link>
            </nav>
          </div>

          {/* Branches */}
          <div>
            <h4 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-wider text-brand-gold mb-4">
              Our Branches
            </h4>
            <nav className="flex flex-col gap-3">
              {operatingBranches.map((branch) => (
                <div key={branch.id} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-gold mt-0.5 shrink-0" aria-hidden />
                  <div className="text-sm">
                    <span className={`font-[var(--font-accent)] font-semibold ${
                      selectedBranch.id === branch.id ? "text-brand-gold" : "text-white/80"
                    }`}>
                      {branch.shortName}
                    </span>
                    <p className="text-white/70 text-xs mt-0.5">{branch.hours}</p>
                  </div>
                </div>
              ))}
              {comingSoonBranches.map((branch) => (
                <div key={branch.id} className="flex items-start gap-2">
                  <Construction className="w-4 h-4 text-white/70 mt-0.5 shrink-0" aria-hidden />
                  <div className="text-sm">
                    <span className="font-[var(--font-accent)] font-semibold text-white/70">
                      {branch.shortName}
                    </span>
                    <p className="text-white/65 text-xs mt-0.5">Coming Soon</p>
                  </div>
                </div>
              ))}
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-wider text-brand-gold mb-4">
              Contact
            </h4>
            <div className="flex flex-col gap-3 text-sm text-white/80">
              <a href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`} className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-brand-gold" aria-hidden /> {selectedBranch.phone}
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-gold" aria-hidden /> {selectedBranch.shortName}, Multan
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-brand-gold" aria-hidden /> {selectedBranch.hours}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.facebook.com/telepizza.pk/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telepizza Pakistan on Facebook"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red transition-colors"
              >
                <Facebook className="w-4 h-4" aria-hidden />
              </a>
              <a
                href="https://www.instagram.com/telepizzapakistan/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telepizza Pakistan on Instagram"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red transition-colors"
              >
                <Instagram className="w-4 h-4" aria-hidden />
              </a>
              <a
                href="https://www.tiktok.com/@telepizzapakistan"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telepizza Pakistan on TikTok"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red transition-colors"
              >
                <MessageCircle className="w-4 h-4" aria-hidden />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/70 text-xs">
            &copy; 2026 Telepizza Pakistan. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-white/70 text-xs">
            <span>Royal Orchard, Multan</span>
            <span className="hidden md:inline" aria-hidden>
              |
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3 h-3" aria-hidden /> Powered by Mianx.ai
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
