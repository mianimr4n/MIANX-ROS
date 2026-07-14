import { Bell } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { listNotifications, markNotificationsRead } from "@/lib/customer-store";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();
  const notifications = user ? listNotifications(user.phone) : [];

  if (!isAuthenticated || !user) {
    return (
      <div className="container py-16 text-center">
        <p className="text-muted-foreground mb-4">Login to view notifications.</p>
        <Link href="/login"><Button className="rounded-2xl brand-gradient text-white">Login</Button></Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10">
      <div className="container max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="brand-heading text-3xl">Notifications</h1>
          {notifications.length > 0 && (
            <Button variant="outline" className="rounded-2xl" onClick={() => markNotificationsRead(user.phone)}>
              Mark all read
            </Button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-3xl border border-border bg-white p-8 text-center text-muted-foreground">
            <Bell className="w-10 h-10 mx-auto mb-3 text-brand-cream-dark" />
            No notifications yet. Place an order to receive updates here.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((entry) => (
              <div
                key={entry.id}
                className={`rounded-3xl border p-4 ${entry.read ? "border-border bg-white" : "border-brand-red/20 bg-brand-red/5"}`}
              >
                <div className="font-semibold">{entry.title}</div>
                <div className="text-sm text-muted-foreground mt-1">{entry.body}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(entry.createdAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
