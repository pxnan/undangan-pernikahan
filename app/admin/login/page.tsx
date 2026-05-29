"use client";

import { FormEvent, useState } from "react";
import { Lock, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("Supabase belum dikonfigurasi. Isi file .env.local terlebih dahulu.");
      return;
    }

    setLoading(true);
    const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    router.push("/admin/dashboard");
  }

  return (
    <main className="grid min-h-screen place-items-center bg-blush-50 px-4">
      <form onSubmit={handleLogin} className="w-full max-w-md rounded-lg bg-white p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blush-500">Admin</p>
        <h1 className="mt-3 font-display text-4xl text-gray-800">Dashboard</h1>

        <label className="mt-8 block text-sm font-semibold text-gray-700">Email</label>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blush-400">
          <Mail size={18} className="text-gray-400" />
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full py-3 outline-none"
            required
          />
        </div>

        <label className="mt-5 block text-sm font-semibold text-gray-700">Password</label>
        <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 px-3 focus-within:border-blush-400">
          <Lock size={18} className="text-gray-400" />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full py-3 outline-none"
            required
          />
        </div>

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</p> : null}
        {!isSupabaseConfigured ? (
          <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-700">
            Environment Supabase belum tersedia.
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-8 w-full rounded-full bg-blush-500 px-5 py-3 font-semibold text-white transition hover:bg-blush-600 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk"}
        </button>
      </form>
    </main>
  );
}
