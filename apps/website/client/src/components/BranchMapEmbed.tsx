import { useState } from "react";
import { ExternalLink, MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getBranchDirectionsUrl,
  getBranchMapEmbedUrl,
  getBranchPlaceUrl,
} from "@/lib/branch-locations";
import type { Branch } from "@/lib/telepizza-types";
import { cn } from "@/lib/utils";

type BranchMapEmbedProps = {
  branch: Branch;
  className?: string;
};

/**
 * Keyless Google Maps embed for the selected operating branch.
 * Falls back to a card with place/directions links when the iframe is blocked.
 */
export function BranchMapEmbed({ branch, className }: BranchMapEmbedProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);

  const embedUrl = getBranchMapEmbedUrl(branch);
  const directionsUrl = getBranchDirectionsUrl(branch);
  const placeUrl = getBranchPlaceUrl(branch);
  const showFallback = !embedUrl || iframeFailed;

  if (branch.status !== "operating") {
    return (
      <div
        className={cn(
          "w-full min-h-[280px] md:min-h-[420px] rounded-2xl border border-border bg-muted/40 flex items-center justify-center p-6 text-center",
          className,
        )}
      >
        <div>
          <MapPin className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-[var(--font-accent)] font-semibold text-brand-charcoal">
            {branch.shortName} — Coming Soon
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Map and directions will appear when this branch is operating.
          </p>
        </div>
      </div>
    );
  }

  if (showFallback) {
    return (
      <div
        className={cn(
          "w-full min-h-[280px] md:min-h-[420px] rounded-2xl border border-border bg-white p-6 flex flex-col justify-center gap-4",
          className,
        )}
        data-testid="branch-map-fallback"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-brand-red rounded-lg flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-[var(--font-accent)] font-bold text-brand-charcoal">{branch.name}</h4>
            <p className="text-sm text-muted-foreground mt-1">{branch.address}</p>
            <p className="text-xs text-muted-foreground mt-2">
              {embedUrl
                ? "Map preview could not load in this browser. Use the links below."
                : "A verified map pin is not available for this branch yet."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {directionsUrl ? (
            <a href={directionsUrl} target="_blank" rel="noopener noreferrer">
              <Button className="bg-brand-red hover:bg-brand-red-light text-white font-[var(--font-accent)] font-semibold">
                <Navigation className="w-4 h-4 mr-2" />
                Get Directions
              </Button>
            </a>
          ) : null}
          {placeUrl ? (
            <a href={placeUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" className="font-[var(--font-accent)] font-semibold">
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Google Maps
              </Button>
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-[280px] md:h-[500px]", className)}>
      {!iframeLoaded ? (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50 text-sm text-muted-foreground"
          data-testid="branch-map-loading"
        >
          Loading map…
        </div>
      ) : null}
      <iframe
        title={`Map — ${branch.name}`}
        src={embedUrl}
        className="w-full h-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
        onLoad={() => setIframeLoaded(true)}
        onError={() => setIframeFailed(true)}
      />
    </div>
  );
}
