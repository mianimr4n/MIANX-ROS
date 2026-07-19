import { Bell } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { rememberAuthNextPath } from "@/lib/auth-redirect";
import { listNotifications, markNotificationsRead } from "@/lib/customer-store";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { profile, user, isAuthenticated } = useAuth();
  const notificationKey = profile?.phone || user?.email || user?.id || "";
  const notifications = notificationKey ? listNotifications(notificationKey) : [];
  const returnPath = "/notifications";

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background py-12 sm:py-16">
        <div className="container max-w-lg">
          <section
            className="overflow-hidden rounded-3xl border border-border bg-white text-center shadow-sm"
            aria-labelledby="notifications-signin-heading"
          >
            <div className="h-1.5 brand-gradient" aria-hidden="true" />
            <div className="space-y-4 px-6 py-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-brand-cream">
                <Bell className="h-7 w-7 text-brand-red" aria-hidden="true" />
              </div>
              <h1 id="notifications-signin-heading" className="brand-heading text-3xl">
                Notifications
              </h1>
              <p className="text-sm text-muted-foreground">
                Login to view notifications.
              </p>
              <Button asChild className="rounded-2xl brand-gradient text-white font-semibold">
                <Link
                  href={`/login?next=${encodeURIComponent(returnPath)}`}
                  onClick={() => rememberAuthNextPath(returnPath)}
                >
                  Login
                </Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                <Link
                  href="/my-telepizza"
                  className="font-semibold text-brand-red underline-offset-2 hover:underline"
                >
                  Back to My Telepizza
                </Link>
              </p>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 sm:py-10">
      <div className="container max-w-2xl space-y-6">
        <header className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-white via-brand-cream/40 to-white shadow-sm">
          <div className="h-1.5 brand-gradient" aria-hidden="true" />
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-brand-red">
                My Telepizza
              </p>
              <h1 className="brand-heading text-3xl">Notifications</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Updates stored on this device for your account.
              </p>
            </div>
            {notifications.length > 0 ? (
              <Button
                variant="outline"
                className="rounded-2xl"
                onClick={() => markNotificationsRead(notificationKey)}
              >
                Mark all read
              </Button>
            ) : null}
          </div>
        </header>

        {notifications.length === 0 ? (
          <div
            className="rounded-3xl border border-dashed border-border bg-white p-8 text-center shadow-sm"
            role="status"
          >
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-cream">
              <Bell className="h-6 w-6 text-brand-red" aria-hidden="true" />
            </div>
            <p className="font-semibold text-brand-charcoal">No notifications yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Place an order to receive on-device updates here. Email alerts are not sent yet.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <Button asChild className="rounded-2xl brand-gradient text-white font-semibold">
                <Link href="/menu">Browse menu</Link>
              </Button>
              <Button asChild variant="outline" className="rounded-2xl">
                <Link href="/my-telepizza#notifications">Notification prefs</Link>
              </Button>
            </div>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Notification inbox">
            {notifications.map((entry) => (
              <li
                key={entry.id}
                className={`rounded-3xl border p-4 shadow-sm ${
                  entry.read
                    ? "border-border bg-white"
                    : "border-brand-red/20 bg-brand-red/5"
                }`}
              >
                <div className="font-semibold text-brand-charcoal">{entry.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{entry.body}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
