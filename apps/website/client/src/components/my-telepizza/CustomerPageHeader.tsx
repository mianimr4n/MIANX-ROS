import type { ReactNode } from "react";
import { Bell, Gift, LogOut, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ProfileCompletion } from "@/lib/my-telepizza-nav";

type StatusTone = "success" | "warning" | "neutral";

function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  const toneClass =
    tone === "success"
      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
      : tone === "warning"
        ? "bg-amber-50 text-amber-900 border-amber-200"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}
    >
      {label}
    </span>
  );
}

type CustomerPageHeaderProps = {
  displayName: string;
  email: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  phoneLabel: string;
  phoneTone: StatusTone;
  phoneHint?: ReactNode;
  profileCompletion?: ProfileCompletion | null;
  onLogout: () => void;
};

/** Customer identity summary for the My Telepizza shell. */
export function CustomerPageHeader({
  displayName,
  email,
  avatarUrl,
  emailVerified,
  phoneLabel,
  phoneTone,
  phoneHint,
  profileCompletion,
  onLogout,
}: CustomerPageHeaderProps) {
  const initial = (displayName.trim().charAt(0) || "T").toUpperCase();

  return (
    <header className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-white via-brand-cream/50 to-white shadow-sm">
      <div className="h-1.5 brand-gradient" aria-hidden="true" />
      <div className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-6">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:gap-4">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-2xl object-cover shadow-sm ring-2 ring-brand-gold/25 sm:h-14 sm:w-14"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl brand-gradient text-lg font-bold text-white shadow-sm ring-2 ring-brand-gold/25 sm:h-14 sm:w-14 sm:text-xl"
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-3.5">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
                My Telepizza
              </p>
              <h1 className="brand-heading break-words text-2xl leading-tight sm:text-3xl">
                Welcome back, {displayName}
              </h1>
              {email ? <p className="break-all text-sm text-muted-foreground">{email}</p> : null}
              {phoneHint}
            </div>
            <div className="flex flex-wrap items-center gap-2" aria-label="Verification status">
              <StatusBadge
                label={emailVerified ? "Email verified" : "Email not verified"}
                tone={emailVerified ? "success" : "warning"}
              />
              <StatusBadge label={phoneLabel} tone={phoneTone} />
            </div>

            {profileCompletion ? (
              <div className="max-w-md space-y-2" aria-label="Profile completion">
                <div className="flex items-center justify-between gap-3 text-xs font-semibold text-brand-charcoal">
                  <span>Profile completion</span>
                  <span>{profileCompletion.percent}% complete</span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuenow={profileCompletion.percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Profile ${profileCompletion.percent}% complete`}
                >
                  <div
                    className="h-full rounded-full brand-gradient motion-safe:transition-[width] motion-reduce:transition-none"
                    style={{ width: `${profileCompletion.percent}%` }}
                  />
                </div>
                <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                  {profileCompletion.items.map((item) => (
                    <li key={item.id} className="flex items-center gap-1.5">
                      <span
                        className={
                          item.done ? "font-semibold text-emerald-700" : "text-muted-foreground"
                        }
                        aria-hidden="true"
                      >
                        {item.done ? "✔" : "✖"}
                      </span>
                      <span className={item.done ? "text-brand-charcoal" : undefined}>
                        {item.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div
              className="flex flex-wrap items-center gap-2"
              aria-label="Coming soon"
            >
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Bell className="h-3 w-3" aria-hidden="true" />
                Notifications · Coming soon
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Gift className="h-3 w-3" aria-hidden="true" />
                Rewards · Coming soon
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                <Star className="h-3 w-3" aria-hidden="true" />
                Membership · Coming soon
              </span>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Telepizza Pakistan · Powered by Mianx.ai
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={onLogout}
          className="min-h-11 shrink-0 rounded-2xl"
          aria-label="Log out of your Telepizza account"
        >
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          Logout
        </Button>
      </div>
    </header>
  );
}
