import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { AuthPageShell } from "@/components/AuthPageShell";

export default function Register() {
  const [, navigate] = useLocation();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    register({ name: name.trim(), phone: phone.trim(), email: email.trim() || undefined });
    navigate("/account");
  };

  return (
    <AuthPageShell
      title="Create Account"
      description="Save your details for faster checkout and order history."
      note="Preview account — stored on this device only until full customer login launches."
    >
      <form onSubmit={handleSubmit} className="rounded-3xl border border-border bg-white p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-2xl" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-2xl" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-2xl" />
        </div>
        <Button type="submit" className="w-full rounded-2xl brand-gradient text-white font-bold py-6">
          Register
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-4 text-center">
        Already registered?{" "}
        <Link href="/login" className="text-brand-red font-semibold hover:underline">
          Login
        </Link>
      </p>
    </AuthPageShell>
  );
}
