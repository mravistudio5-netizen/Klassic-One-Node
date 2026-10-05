import React, { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "@/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const returnTo = safeReturnTo();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const data = await apiFetch("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
        }),
      });

      if (!data?.token) {
        throw new Error(
          "Login failed. Authentication token was not received."
        );
      }

      localStorage.setItem("klassic_token", data.token);

      if (data.user) {
        localStorage.setItem(
          "klassic_user",
          JSON.stringify(data.user)
        );
      }

      window.location.href = returnTo || "/";
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err?.message || "Invalid email or password"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError(
      "Google Login is not connected yet. Please use email and password."
    );
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        {/* HEADER */}
        <div className="text-center mb-9">
          <div className="flex justify-center mb-5">
  <img
  src="/klassic-logo.png"
  alt="Klassic One"
  className="h-14 w-auto object-contain"
/>
</div>

          <h1 className="text-3xl font-bold tracking-tight text-slate-950">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Log in to your account
          </p>
        </div>
        <p className="mt-3 text-xs text-slate-400">
  Developed by Ravion
</p>

        {/* CARD */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8">

          {/* GOOGLE */}
          <Button
            variant="outline"
            className="w-full h-12 text-sm font-medium mb-6"
            onClick={handleGoogle}
            type="button"
          >
            <GoogleIcon className="w-5 h-5 mr-2" />
            Continue with Google
          </Button>

          {/* OR */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>

            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400">
                OR
              </span>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* EMAIL */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Email
              </Label>

              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  aria-hidden="true"
                />

                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="space-y-2">

              <div className="flex items-center justify-between">
                <Label htmlFor="password">
                  Password
                </Label>

                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>

              <div className="relative">
                <Lock
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                  aria-hidden="true"
                />

                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {/* LOGIN BUTTON */}
            <Button
              type="submit"
              className="w-full h-12 font-medium"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Log in"
              )}
            </Button>

          </form>
        </div>

        {/* FOOTER */}
        <div className="text-center mt-7 text-sm text-slate-500">
          Need access?{" "}
          <Link
            to="/register"
            className="text-slate-900 font-medium hover:underline"
          >
            Request an invite
          </Link>
        </div>

      </div>
    </div>
  );
}