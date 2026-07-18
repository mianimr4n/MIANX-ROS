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
        scrolled
          ? "bg-white/95 backdrop-blur-xl shadow-md shadow-brand-red/5"
          : "bg-transparent"
      }`}
    >
      <div className="container flex items-center justify-between h-16 md:h-20">
        {/* Logo */}
        <BrandLogo
          imageClassName={scrolled ? undefined : "ring-2 ring-white/20"}
        />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`font-[var(--font-accent)] font-medium text-sm px-4 py-2 rounded-lg transition-all duration-200 active:scale-95 ${
                isNavActive(link.href)
                  ? "text-brand-red bg-brand-red/10"
                  : scrolled
                  ? "text-brand-charcoal/70 hover:text-brand-charcoal hover:bg-brand-cream-dark"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Branch Selector */}
          <div ref={dropdownRef} className="relative hidden md:block">
            <button
              onClick={() => setBranchDropdownOpen(!branchDropdownOpen)}
              className={`flex items-center gap-2 text-sm font-[var(--font-accent)] font-medium transition-colors px-3 py-2 rounded-lg ${
                scrolled
                  ? "text-brand-charcoal hover:bg-brand-cream-dark"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span className="max-w-[120px] truncate">{selectedBranch.shortName}</span>
              {branchDropdownOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
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
              className={`hidden md:flex items-center gap-2 text-sm font-[var(--font-accent)] font-medium transition-colors ${
                scrolled ? "text-brand-charcoal" : "text-white"
              }`}
            >
              <Phone className="w-4 h-4" />
              <span>{selectedBranch.phone}</span>
            </a>
          )}

          {/* My Telepizza */}
          <Link
            href={hubHref}
            onClick={() => {
              if (!isAuthenticated) rememberAuthNextPath("/my-telepizza");
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              className={`hidden md:inline-flex rounded-xl font-[var(--font-accent)] font-semibold ${
                pathOnly === "/my-telepizza" || pathOnly === "/account"
                  ? "text-brand-red"
                  : scrolled
                    ? "text-brand-charcoal hover:text-brand-red"
                    : "text-white hover:text-brand-gold"
              }`}
            >
              My Telepizza
            </Button>
          </Link>

          {/* Cart Button */}
          <button
            onClick={toggleCart}
            aria-label={totalItems > 0 ? `Cart, ${totalItems} items` : "Open cart"}
            className={`relative p-2.5 rounded-xl transition-all duration-200 active:scale-95 ${
              scrolled
                ? "bg-brand-cream-dark hover:bg-brand-red hover:text-white text-brand-charcoal"
                : "bg-white/10 hover:bg-brand-red hover:text-white text-white"
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-red text-white text-[10px] font-[var(--font-accent)] font-bold rounded-full flex items-center justify-center shadow-md">
                {totalItems}
              </span>
            )}
          </button>

          {/* Order Now CTA */}
          <Link href="/menu">
            <Button
              className="hidden sm:flex bg-brand-red hover:bg-brand-red-dark text-white font-[var(--font-accent)] font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-brand-red/20 transition-all active:scale-95"
            >
              Order Now
            </Button>
          </Link>

          {/* Mobile Menu */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className={`md:hidden p-2.5 rounded-xl transition-all ${
                  scrolled
                    ? "bg-brand-cream-dark text-brand-charcoal"
                    : "bg-white/10 text-white"
                }`}
              >
                {mobileOpen ? <X className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-brand-charcoal border-none p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <BrandLogo
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    imageClassName="h-9 w-9"
                  />
                </div>
                <nav className="flex-1 p-6 flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className={`font-[var(--font-display)] font-semibold text-lg py-2 transition-colors ${
                        isNavActive(link.href) ? "text-brand-red" : "text-white hover:text-brand-gold"
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
                    className="font-[var(--font-display)] font-semibold text-lg py-2 text-left text-white hover:text-brand-gold"
                  >
                    Cart{totalItems > 0 ? ` (${totalItems})` : ""}
                  </button>
                  <Link
                    href={hubHref}
                    onClick={() => {
                      if (!isAuthenticated) rememberAuthNextPath("/my-telepizza");
                      setMobileOpen(false);
                    }}
                    className={`font-[var(--font-display)] font-semibold text-lg py-2 transition-colors ${
                      pathOnly === "/my-telepizza" || pathOnly === "/account"
                        ? "text-brand-red"
                        : "text-white hover:text-brand-gold"
                    }`}
                  >
                    My Telepizza
                  </Link>
                  <div className="mt-auto pt-6 border-t border-white/10 space-y-3">
                    {/* Mobile Branch Selector */}
                    <div className="bg-white/5 rounded-xl p-4">
                      <span className="text-xs text-white/40 uppercase tracking-wider font-[var(--font-accent)] font-medium">
                        Your Branch
                      </span>
                      <div className="mt-2 space-y-2">
                        {/* Operating */}
                        {operatingBranches.map((branch) => (
                          <button
                            key={branch.id}
                            onClick={() => {
                              setSelectedBranch(branch);
                              setMobileOpen(false);
                            }}
                            className={`w-full text-left p-2 rounded-lg flex items-center gap-2 transition-colors ${
                              selectedBranch.id === branch.id
                                ? "bg-brand-red/20 border border-brand-red/40"
                                : "hover:bg-white/5"
                            }`}
                          >
                            <MapPin className="w-4 h-4 text-brand-gold" />
                            <span className={`text-sm font-[var(--font-accent)] ${
                              selectedBranch.id === branch.id ? "text-brand-red font-bold" : "text-white/70"
                            }`}>
                              {branch.shortName}
                            </span>
                          </button>
                        ))}
                        {/* Coming Soon */}
                        {comingSoonBranches.map((branch) => (
                          <div
                            key={branch.id}
                            className="w-full text-left p-2 rounded-lg flex items-center gap-2 opacity-50"
                          >
                            <Construction className="w-4 h-4 text-white/40" />
                            <span className="text-sm font-[var(--font-accent)] text-white/40">
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
