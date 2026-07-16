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

      <div className="relative container max-w-md py-14 md:py-16">
        <div className="flex flex-col items-center text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3 group">
            <BrandLogoMark className="transition-transform group-hover:scale-[1.03]" />
            <span className="font-[var(--font-display)] font-extrabold text-2xl tracking-tight text-brand-charcoal">
              {BRAND.name}
            </span>
          </Link>
          <p className="mt-2 text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs">
            {BRAND.tagline}
          </p>
          <h1 className="brand-heading text-3xl md:text-4xl mt-5 mb-2">{title}</h1>
          <p className="text-muted-foreground max-w-sm">{description}</p>
          {note ? (
            <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mt-4 text-left w-full">
              {note}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
