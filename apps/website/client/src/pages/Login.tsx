import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function Login() {
  const [, navigate] = useLocation();
  const { login, user } = useAuth();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const ok = login(phone.trim());
    if (!ok) {
      setError("No account found for this phone. Please register first.");
      return;
    }
    navigate("/account");
  };

  return (
    <div className="min-h-screen bg-background py-16">
      <div className="container max-w-md">
        <h1 className="brand-heading text-3xl mb-2">Login</h1>
        <p className="text-muted-foreground mb-2">Sign in with the phone number you used to register.</p>
        <p className="text-xs text-muted-foreground mb-8">
          Preview account — stored on this device only until full customer login launches.
        </p>
        <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-white p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-2xl" />
          </div>
          {error && <p className="text-sm text-brand-red">{error}</p>}
          <Button type="submit" className="w-full rounded-2xl brand-gradient text-white font-bold py-6">
            Login
          </Button>
        </form>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          New here?{" "}
          <Link href="/register" className="text-brand-red font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
