import { Link } from "wouter";
import { handleLogoError } from "@/lib/image-fallback";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  href?: string;
  className?: string;
  imageClassName?: string;
  showRegion?: boolean;
  onClick?: () => void;
};

export function BrandLogo({
  href = "/",
  className,
  imageClassName,
  showRegion = false,
  onClick,
}: BrandLogoProps) {
  const content = (
    <>
      <img
        src={BRAND.logoPrimary}
        alt={BRAND.name}
        onError={handleLogoError}
        className={cn("h-10 w-10 md:h-11 md:w-11 rounded-xl object-cover shadow-sm", imageClassName)}
      />
      {showRegion && (
        <div>
          <span className="font-[var(--font-display)] font-extrabold text-lg tracking-tight text-brand-charcoal">
            {BRAND.name.toUpperCase()}
          </span>
          <span className="block text-[10px] font-[var(--font-accent)] text-brand-gold uppercase tracking-[0.15em] -mt-1">
            {BRAND.region}
          </span>
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn("inline-flex items-center gap-2.5 group", className)}
      >
        <span className="transition-transform duration-200 group-hover:scale-105 inline-flex items-center gap-2.5">
          {content}
        </span>
      </Link>
    );
  }

  return <div className={cn("inline-flex items-center gap-2.5", className)}>{content}</div>;
}

export function BrandLogoMark({ className }: { className?: string }) {
  return (
    <img
      src={BRAND.logoPrimary}
      alt={BRAND.name}
      onError={handleLogoError}
      className={cn("h-16 w-16 rounded-2xl object-cover shadow-lg shadow-brand-red/20", className)}
    />
  );
}
