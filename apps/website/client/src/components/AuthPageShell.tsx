import type { ReactNode } from "react";
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
    <div className="min-h-screen bg-background py-16">
      <div className="container max-w-md">
        <div className="flex flex-col items-center text-center mb-8">
          <BrandLogoMark />
          <p className="mt-4 text-brand-gold font-[var(--font-accent)] font-bold uppercase tracking-[0.2em] text-xs">
            {BRAND.tagline}
          </p>
          <h1 className="brand-heading text-3xl mt-2 mb-2">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
          {note && <p className="text-xs text-muted-foreground mt-2">{note}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
