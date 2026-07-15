import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AuthForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert(error.message);
    else alert('Check your email for the confirmation link!');
    setLoading(false);
  };

  const handleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    else alert('Login Successful!');
    setLoading(false);
  };

  return (
    <div className="p-4">
      <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} className="border p-2 m-2" />
      <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} className="border p-2 m-2" />
      <button onClick={handleSignIn} disabled={loading} className="bg-blue-500 text-white p-2">Login</button>
      <button onClick={handleSignUp} disabled={loading} className="bg-green-500 text-white p-2 m-2">Sign Up</button>
    </div>
  );
}