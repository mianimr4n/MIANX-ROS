/* Telepizza Pakistan — premium footer with Multan identity + Mianx.ai */
import { Link } from "wouter";
import { MapPin, Phone, Instagram, Facebook, MessageCircle, Heart, Zap, Construction } from "lucide-react";
import { BRAND } from "@/lib/brand";
import { useBranch } from "@/contexts/BranchContext";
import { BrandLogo } from "@/components/BrandLogo";

export default function Footer() {
  const { selectedBranch, allBranches } = useBranch();
  const operatingBranches = allBranches.filter((branch) => branch.status === "operating");
  const comingSoonBranches = allBranches.filter((branch) => branch.status === "coming-soon");
  const whatsappUrl = `https://wa.me/92${selectedBranch.phone.replace(/\D/g, "").replace(/^0/, "")}`;

  return (
    <footer className="bg-brand-charcoal text-white">
      <div className="h-1 w-full brand-stripe" aria-hidden />
      <div className="container py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div>
            <BrandLogo showRegion imageClassName="h-9 w-9" />
            <p className="text-white/55 text-sm leading-relaxed max-w-xs mt-4">
              {BRAND.identity} Fresh dough, premium toppings, and smarter Multan ordering.
            </p>
            <p className="mt-3 text-xs text-white/40 inline-flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-brand-gold" aria-hidden />
              AI-powered customer experience · Powered by {BRAND.poweredBy}
            </p>
          </div>

          <div>
            <h4 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-wider text-brand-gold mb-4">
              Quick Links
            </h4>
            <nav className="flex flex-col gap-3" aria-label="Footer">
              <Link href="/" className="text-white/60 hover:text-white text-sm transition-colors focus-ring-brand rounded">
                Home
              </Link>
              <Link href="/menu" className="text-white/60 hover:text-white text-sm transition-colors focus-ring-brand rounded">
                Full Menu
              </Link>
              <Link href="/menu?category=Deals" className="text-white/60 hover:text-white text-sm transition-colors focus-ring-brand rounded">
                Deals
              </Link>
              <Link href="/my-telepizza" className="text-white/60 hover:text-white text-sm transition-colors focus-ring-brand rounded">
                My Telepizza
              </Link>
              <Link href="/track" className="text-white/60 hover:text-white text-sm transition-colors focus-ring-brand rounded">
                Track Order
              </Link>
              <Link href="/about" className="text-white/60 hover:text-white text-sm transition-colors focus-ring-brand rounded">
                About Us
              </Link>
              <Link href="/contact" className="text-white/60 hover:text-white text-sm transition-colors focus-ring-brand rounded">
                Contact
              </Link>
            </nav>
          </div>

          <div>
            <h4 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-wider text-brand-gold mb-4">
              Our Branches
            </h4>
            <nav className="flex flex-col gap-3" aria-label="Branches">
              {operatingBranches.map((branch) => (
                <div key={branch.id} className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-brand-red mt-0.5 shrink-0" aria-hidden />
                  <div className="text-sm min-w-0">
                    <span
                      className={`font-[var(--font-accent)] font-semibold break-words ${
                        selectedBranch.id === branch.id ? "text-brand-red" : "text-white/60"
                      }`}
                    >
                      {branch.shortName}
                    </span>
                    <p className="text-white/40 text-xs mt-0.5">{branch.hours}</p>
                  </div>
                </div>
              ))}
              {comingSoonBranches.map((branch) => (
                <div key={branch.id} className="flex items-start gap-2 opacity-50">
                  <Construction className="w-4 h-4 text-white/40 mt-0.5 shrink-0" aria-hidden />
                  <div className="text-sm">
                    <span className="font-[var(--font-accent)] font-semibold text-white/40">
                      {branch.shortName}
                    </span>
                    <p className="text-white/20 text-xs mt-0.5">Coming Soon</p>
                  </div>
                </div>
              ))}
            </nav>
          </div>

          <div>
            <h4 className="font-[var(--font-display)] font-bold text-sm uppercase tracking-wider text-brand-gold mb-4">
              Contact
            </h4>
            <div className="flex flex-col gap-3 text-sm text-white/60">
              <a
                href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`}
                className="flex items-center gap-2 hover:text-white transition-colors focus-ring-brand rounded"
              >
                <Phone className="w-4 h-4 text-brand-red" aria-hidden /> {selectedBranch.phone}
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-white transition-colors focus-ring-brand rounded"
              >
                <MessageCircle className="w-4 h-4 text-brand-red" aria-hidden /> WhatsApp
              </a>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-red" aria-hidden /> {selectedBranch.shortName}, Multan
              </div>
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-brand-red" aria-hidden /> {selectedBranch.hours}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <a
                href="https://www.facebook.com/telepizza.pk/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telepizza on Facebook"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red transition-colors focus-ring-brand"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="https://www.instagram.com/telepizzapakistan/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telepizza on Instagram"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red transition-colors focus-ring-brand"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://www.tiktok.com/@telepizzapakistan"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Telepizza on TikTok"
                className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center hover:bg-brand-red transition-colors focus-ring-brand"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-xs text-center md:text-left">
            &copy; 2026 Telepizza Pakistan. All rights reserved.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-white/30 text-xs">
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
