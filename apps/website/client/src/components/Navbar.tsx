/* Flame & Crust Design: Bold street-food energy with Telepizza Red accent.
   Sticky navbar that transitions from transparent over hero to opaque when scrolled.
   Signature brand color #D22630 for active states and CTA.
   Updated with branch selector — Branch 2 marked as 'Coming Soon' (non-selectable). */
import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingCart, Menu as MenuIcon, X, Phone, MapPin, ChevronDown, ChevronUp, Check, Construction } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBranch } from "@/contexts/BranchContext";
import { useAuth } from "@/contexts/AuthContext";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { rememberAuthNextPath } from "@/lib/auth-redirect";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/menu?category=Deals", label: "Deals" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);
  const [location] = useLocation();
  const { totalItems, toggleCart } = useCart();
  const { selectedBranch, setSelectedBranch, allBranches } = useBranch();
  const { isAuthenticated } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pathOnly = location.split("?")[0] ?? location;
  const hubHref = isAuthenticated ? "/my-telepizza" : `/login?next=${encodeURIComponent("/my-telepizza")}`;
  // Home keeps transparent-over-hero chrome; other routes use opaque bar for AA contrast.
  const chromeOpaque = scrolled || pathOnly !== "/";

  function isNavActive(href: string): boolean {
    if (href === "/") return pathOnly === "/";
    if (href.startsWith("/menu?category=Deals")) {
      return pathOnly === "/menu" && (location.includes("category=Deals") || location.includes("category=deals"));
    }
    if (href === "/menu") {
      return pathOnly === "/menu" && !location.includes("category=Deals") && !location.includes("category=deals");
    }
    return pathOnly === href || pathOnly.startsWith(`${href}/`);
  }

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBranchDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const operatingBranches = allBranches.filter((branch) => branch.status === "operating");
  const comingSoonBranches = allBranches.filter((branch) => branch.status === "coming-soon");

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        chromeOpaque
          ? "bg-white/95 backdrop-blur-xl shadow-md shadow-brand-red/10 border-b border-brand-red/10"
          : "bg-brand-charcoal border-b border-white/10"
      }`}
    >
      {chromeOpaque && (
        <div className="h-1 w-full brand-stripe" aria-hidden />
      )}
      <div className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <BrandLogo
          imageClassName={chromeOpaque ? "ring-2 ring-brand-red/15" : "ring-2 ring-brand-gold/35"}
        />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`relative font-[var(--font-accent)] font-semibold text-sm min-h-11 inline-flex items-center px-4 py-2 rounded-lg transition-all duration-200 active:scale-95 ${
                isNavActive(link.href)
                  ? chromeOpaque
                    ? "text-brand-red-dark bg-brand-red/10"
                    : "text-brand-gold bg-white/15"
                  : chromeOpaque
                  ? "text-brand-charcoal hover:text-brand-red-dark hover:bg-brand-cream-dark"
                  : "text-white hover:text-brand-gold hover:bg-white/10"
              }`}
            >
              {link.label}
              {isNavActive(link.href) && (
                <span className="absolute left-3 right-3 -bottom-0.5 h-0.5 rounded-full bg-brand-gold" aria-hidden />
              )}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Branch Selector */}
          <div ref={dropdownRef} className="relative hidden md:block">
            <button
              type="button"
              aria-expanded={branchDropdownOpen}
              aria-haspopup="listbox"
              aria-label={`Branch: ${selectedBranch.shortName}`}
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className={`flex items-center gap-2 text-sm font-[var(--font-accent)] font-medium transition-colors min-h-11 px-3 py-2 rounded-lg ${
                chromeOpaque
                  ? "text-brand-charcoal hover:bg-brand-cream-dark"
                  : "text-white hover:bg-white/10"
              }`}
            >
              <MapPin className="w-4 h-4" aria-hidden />
              <span className="max-w-[120px] truncate">{selectedBranch.shortName}</span>
              {branchDropdownOpen ? (
                <ChevronUp className="w-3 h-3" aria-hidden />
              ) : (
                <ChevronDown className="w-3 h-3" aria-hidden />
              )}
            </button>

            <AnimatePresence>
              {branchDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                  className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-border overflow-hidden z-50"
                >
                  {/* Operating branches */}
                  <div className="p-3 border-b border-border">
                    <span className="text-xs font-[var(--font-accent)] font-semibold text-muted-foreground uppercase tracking-wider">
                      Select Your Branch
                    </span>
                  </div>
                  <div className="p-2">
                    {operatingBranches.map((branch) => (
                      <button
                        key={branch.id}
                        onClick={() => {
                          setSelectedBranch(branch);
                          setBranchDropdownOpen(false);
                        }}
                        className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition-colors ${
                          selectedBranch.id === branch.id
                            ? "bg-brand-red/5 border border-brand-red/20"
                            : "hover:bg-brand-cream-dark"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          selectedBranch.id === branch.id
                            ? "bg-brand-red text-white"
                            : "bg-brand-cream text-brand-charcoal"
                        }`}>
                          <MapPin className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`font-[var(--font-accent)] font-semibold text-sm ${
                            selectedBranch.id === branch.id ? "text-brand-red" : "text-brand-charcoal"
                          }`}>
                            {branch.name}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {branch.address}
                          </div>
                          <div className="text-xs text-brand-gold font-[var(--font-accent)] font-medium mt-0.5">
                            {branch.hours}
                          </div>
                        </div>
                        {selectedBranch.id === branch.id && (
                          <Check className="w-4 h-4 text-brand-red shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Coming soon branches */}
                  {comingSoonBranches.length > 0 && (
                    <>
                      <div className="px-3 py-2 border-t border-border">
                        <span className="text-xs font-[var(--font-accent)] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                          <Construction className="w-3 h-3" />
                          Coming Soon
                        </span>
                      </div>
                      <div className="p-2">
                        {comingSoonBranches.map((branch) => (
                          <div
                            key={branch.id}
                            className="w-full text-left p-3 rounded-lg flex items-center gap-3 opacity-60"
                          >
                            <div className="w-8 h-8 rounded-lg bg-brand-cream text-brand-charcoal/40 flex items-center justify-center shrink-0">
                              <Construction className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-[var(--font-accent)] font-semibold text-sm text-brand-charcoal/60">
                                {branch.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {branch.address}
                              </div>
                              <div className="text-xs text-brand-gold/60 font-[var(--font-accent)] font-medium mt-0.5">
                                Opening Soon
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Phone */}
          {selectedBranch.status === "operating" && (
            <a
              href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`}
              className={`hidden md:flex items-center gap-2 text-sm font-[var(--font-accent)] font-medium transition-colors min-h-11 ${
                chromeOpaque ? "text-brand-charcoal" : "text-white"
              }`}
            >
              <Phone className="w-4 h-4" aria-hidden />
              <span>{selectedBranch.phone}</span>
            </a>
          )}

          {/* My Telepizza — hide entire link on small screens (mobile sheet covers account) */}
          <Link
            href={hubHref}
            className="hidden md:inline-flex"
            onClick={() => {
              if (!isAuthenticated) rememberAuthNextPath("/my-telepizza");
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className={`rounded-xl font-[var(--font-accent)] font-semibold min-h-11 ${
                pathOnly === "/my-telepizza" || pathOnly === "/account"
                  ? "text-brand-red-dark"
                  : chromeOpaque
                    ? "text-brand-charcoal hover:text-brand-red-dark"
                    : "text-white hover:text-brand-gold"
              }`}
            >
              My Telepizza
            </Button>
          </Link>

          {/* Cart Button */}
          <button
            type="button"
            onClick={toggleCart}
            aria-label={totalItems > 0 ? `Cart, ${totalItems} items` : "Cart"}
            className={`relative inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl transition-all duration-200 active:scale-95 ${
              chromeOpaque
                ? "bg-brand-cream-dark hover:bg-brand-red hover:text-white text-brand-charcoal"
                : "bg-white/10 hover:bg-brand-red hover:text-white text-white"
            }`}
          >
            <ShoppingCart className="w-5 h-5" aria-hidden />
            {totalItems > 0 && (
              <span
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-red text-white text-[10px] font-[var(--font-accent)] font-bold rounded-full flex items-center justify-center shadow-md"
                aria-hidden
              >
                {totalItems}
              </span>
            )}
          </button>

          {/* Order Now CTA — hide entire link below sm (mobile sheet includes Order Now) */}
          <Link href="/menu" className="hidden sm:inline-flex">
            <Button
              className="bg-brand-red-dark hover:bg-brand-red text-white font-[var(--font-accent)] font-bold text-sm min-h-11 px-5 py-2.5 rounded-xl shadow-lg shadow-brand-red/25 ring-1 ring-brand-gold/40 transition-all active:scale-95"
            >
              Order Now
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className={`md:hidden inline-flex items-center justify-center min-h-11 min-w-11 rounded-xl transition-all ${
                  chromeOpaque
                    ? "bg-brand-cream-dark text-brand-charcoal"
                    : "bg-white/10 text-white"
                }`}
              >
                {mobileOpen ? <X className="w-5 h-5" aria-hidden /> : <MenuIcon className="w-5 h-5" aria-hidden />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[min(100vw-1rem,20rem)] bg-brand-charcoal border-none p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="h-1 w-full brand-stripe" aria-hidden />
                <div className="flex items-center justify-between p-5 border-b border-white/10">
                  <BrandLogo
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    imageClassName="h-9 w-9 ring-2 ring-brand-gold/30"
                  />
                  <span className="font-[var(--font-display)] font-bold text-brand-gold text-sm tracking-wide">
                    Telepizza
                  </span>
                </div>
                <nav className="flex-1 p-5 flex flex-col gap-1 overflow-y-auto">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`font-[var(--font-display)] font-semibold text-lg py-3 px-3 rounded-xl transition-colors ${
                        isNavActive(link.href)
                          ? "text-brand-gold bg-white/10 border border-brand-gold/40"
                          : "text-white hover:text-brand-gold hover:bg-white/5"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      toggleCart();
                      setMobileOpen(false);
                    }}
                    className="font-[var(--font-display)] font-semibold text-lg min-h-11 py-3 px-3 rounded-xl text-left text-white hover:text-brand-gold hover:bg-white/5"
                  >
                    Cart{totalItems > 0 ? `, ${totalItems} items` : ""}
                  </button>
                  <Link
                    href={hubHref}
                    onClick={() => {
                      if (!isAuthenticated) rememberAuthNextPath("/my-telepizza");
                      setMobileOpen(false);
                    }}
                    className={`font-[var(--font-display)] font-semibold text-lg py-3 px-3 rounded-xl transition-colors ${
                      pathOnly === "/my-telepizza" || pathOnly === "/account"
                        ? "text-brand-gold bg-white/10 border border-brand-gold/40"
                        : "text-white hover:text-brand-gold hover:bg-white/5"
                    }`}
                  >
                    My Telepizza
                  </Link>
                  <Link href="/menu" onClick={() => setMobileOpen(false)} className="mt-3">
                    <Button className="w-full bg-brand-red hover:bg-brand-red-dark text-white font-[var(--font-accent)] font-bold rounded-xl py-6 shadow-lg shadow-brand-red/30 ring-1 ring-brand-gold/40">
                      Order Now
                    </Button>
                  </Link>
                  <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
                    {/* Mobile Branch Selector */}
                    <div className="bg-white/5 rounded-xl p-4">
                      <span className="text-xs text-white/75 uppercase tracking-wider font-[var(--font-accent)] font-medium">
                        Your Branch
                      </span>
                      <div className="mt-2 space-y-2">
                        {/* Operating */}
                        {operatingBranches.map((branch) => (
                          <button
                            key={branch.id}
                            type="button"
                            onClick={() => {
                              setSelectedBranch(branch);
                              setMobileOpen(false);
                            }}
                            className={`w-full text-left min-h-11 p-3 rounded-lg flex items-center gap-2 transition-colors ${
                              selectedBranch.id === branch.id
                                ? "bg-brand-red/20 border border-brand-red/40"
                                : "hover:bg-white/5"
                            }`}
                          >
                            <MapPin className="w-4 h-4 text-brand-gold" aria-hidden />
                            <span className={`text-sm font-[var(--font-accent)] ${
                              selectedBranch.id === branch.id ? "text-brand-gold font-bold" : "text-white"
                            }`}>
                              {branch.shortName}
                            </span>
                          </button>
                        ))}
                        {/* Coming Soon */}
                        {comingSoonBranches.map((branch) => (
                          <div
                            key={branch.id}
                            className="w-full text-left min-h-11 p-3 rounded-lg flex items-center gap-2 opacity-70"
                          >
                            <Construction className="w-4 h-4 text-white/75" aria-hidden />
                            <span className="text-sm font-[var(--font-accent)] text-white/75">
                              {branch.shortName} — Coming Soon
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {selectedBranch.status === "operating" && (
                      <>
                        <a href={`tel:+92${selectedBranch.phone.replace(/-/g, "").replace(/^0/, "")}`} className="flex items-center gap-3 text-white/70 text-sm">
                          <Phone className="w-4 h-4" /> {selectedBranch.phone}
                        </a>
                        <div className="flex items-center gap-3 text-white/70 text-sm">
                          <MapPin className="w-4 h-4" /> {selectedBranch.shortName}, Multan
                        </div>
                      </>
                    )}
                  </div>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
