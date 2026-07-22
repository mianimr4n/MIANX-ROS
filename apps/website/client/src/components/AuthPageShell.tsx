import type { ReactNode } from "react";
import { Link } from "wouter";
import { BrandLogoMark } from "@/components/BrandLogo";
import { BRAND } from "@/lib/brand";

type AuthPageShellProps = {
  title: string;
  description: string;
  note?: string;
  children: ReactNode;
};

export function AuthPageShell({ title, description, note, children }: AuthPageShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#FFE8E0_0%,transparent_55%),radial-gradient(ellipse_at_bottom_right,#FFF3C4_0%,transparent_45%),linear-gradient(180deg,#FFF7F3_0%,#FFFFFF_55%,#FFF7F3_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 right-[-4rem] h-64 w-64 rounded-full bg-brand-red/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-5rem] left-[-3rem] h-72 w-72 rounded-full bg-brand-gold/15 blur-3xl"
      />

      <div className="relative container grid min-h-screen items-center gap-10 py-14 md:py-16 lg:grid-cols-2 lg:gap-14">
        <aside className="hidden lg:flex flex-col justify-center rounded-[2rem] border border-brand-red/10 bg-brand-charcoal p-10 text-white shadow-2xl shadow-brand-red/10 overflow-hidden relative min-h-[32rem]">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(245,184,0,0.28),transparent_45%),radial-gradient(circle_at_20%_80%,rgba(227,30,36,0.35),transparent_50%)]"
            aria-hidden
          />
          <div className="relative z-10">
            <BrandLogoMark className="mb-6 ring-2 ring-brand-gold/40" />
            <p className="font-[var(--font-display)] font-black text-4xl leading-none">{BRAND.name}</p>
            <p className="mt-2 text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs">
              {BRAND.tagline}
            </p>
            <h2 className="mt-8 font-[var(--font-display)] font-extrabold text-3xl leading-tight">
              Your Telepizza, remembered.
            </h2>
            <p className="mt-4 text-white/75 max-w-sm leading-relaxed">
              Save addresses, follow orders and enjoy a faster checkout — Multan&apos;s AI-powered pizza experience.
            </p>
            <ul className="mt-8 space-y-2 text-sm text-white/70">
              <li>Secure Google & Facebook sign-in</li>
              <li>Live order updates after confirmation</li>
              <li>Powered by {BRAND.poweredBy}</li>
            </ul>
          </div>
          <img
            src="/images/menu-pizza.jpg"
            alt=""
            className="pointer-events-none absolute -right-8 -bottom-10 h-56 w-56 rounded-full object-cover opacity-40 ring-4 ring-white/10"
            aria-hidden
          />
        </aside>

        <div className="mx-auto w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-8 lg:items-start lg:text-left">
            <Link href="/" className="inline-flex flex-col items-center gap-3 group lg:items-start">
              <BrandLogoMark className="transition-transform group-hover:scale-[1.03] lg:hidden" />
              <span className="font-[var(--font-display)] font-extrabold text-2xl tracking-tight text-brand-charcoal lg:hidden">
                {BRAND.name}
              </span>
            </Link>
            <p className="mt-2 text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs lg:hidden">
              {BRAND.tagline}
            </p>
            <h1 className="brand-heading text-3xl md:text-4xl mt-5 mb-2">{title}</h1>
            <p className="text-muted-foreground max-w-sm">{description}</p>
            {note ? (
              <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-4 text-left w-full">
                {note}
              </p>
            ) : null}
            <p className="mt-3 text-xs text-muted-foreground">Powered by {BRAND.poweredBy}</p>
          </div>
          {children}
          <p className="mt-6 text-center text-xs text-muted-foreground lg:text-left">
            <Link href="/contact" className="underline-offset-2 hover:underline focus-ring-brand rounded">
              Support
            </Link>
            <span aria-hidden> · </span>
            <Link href="/about" className="underline-offset-2 hover:underline focus-ring-brand rounded">
              Privacy & about
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
