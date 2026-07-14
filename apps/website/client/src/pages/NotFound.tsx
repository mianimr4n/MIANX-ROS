import { Button } from "@/components/ui/button";
import { Home, Pizza } from "lucide-react";
import { Link, useLocation } from "wouter";
import { BrandLogoMark } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-brand-cream px-4">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-white p-8 md:p-10 text-center shadow-xl shadow-brand-red/5">
        <div className="flex justify-center mb-6">
          <BrandLogoMark className="h-20 w-20" />
        </div>

        <p className="text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs mb-3">
          {BRAND.tagline}
        </p>
        <h1 className="brand-heading text-5xl text-brand-red mb-2">404</h1>
        <h2 className="font-[var(--font-display)] font-bold text-2xl text-brand-charcoal mb-4">
          Page Not Found
        </h2>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Sorry, the page you are looking for doesn&apos;t exist. Head back to the menu and keep
          exploring {BRAND.legalName}.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => setLocation("/")}
            className="rounded-2xl brand-gradient text-white font-bold px-6 py-6"
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
          <Link href="/menu">
            <Button
              variant="outline"
              className="w-full rounded-2xl border-brand-red/30 text-brand-red hover:bg-brand-red hover:text-white font-bold px-6 py-6"
            >
              <Pizza className="w-4 h-4 mr-2" />
              Browse Menu
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
