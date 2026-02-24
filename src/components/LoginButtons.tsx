"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";

const providerConfig = {
  microsoft: { label: "Sign in with Microsoft", color: "#2f2f2f" },
  github: { label: "Sign in with GitHub", color: "#24292e" },
  google: { label: "Sign in with Google", color: "#4285f4" },
};

interface LoginButtonsProps {
  enabledProviders: string[];
  hasStaticUsers: boolean;
  callbackURL?: string;
}

export function LoginButtons({ enabledProviders, hasStaticUsers, callbackURL = "/portal" }: LoginButtonsProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSocialSignIn = (provider: "microsoft" | "github" | "google") => {
    authClient.signIn.social({
      provider,
      callbackURL,
    });
  };

  const handleCredentialSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/credential-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        window.location.href = callbackURL;
      } else {
        const data = await res.json();
        setError(data.error || "Sign in failed");
      }
    } catch {
      setError("Sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const socialProviders = enabledProviders.filter(
    (p): p is "microsoft" | "github" | "google" => p in providerConfig
  );

  return (
    <div className="flex flex-col gap-4">
      {hasStaticUsers && (
        <form onSubmit={handleCredentialSignIn} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full py-2.5 px-4 rounded-md border focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ borderColor: 'var(--input-border)', '--tw-ring-color': 'var(--input-focus-ring)' } as React.CSSProperties}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full py-2.5 px-4 rounded-md border focus:outline-none focus:ring-2 focus:border-transparent"
            style={{ borderColor: 'var(--input-border)', '--tw-ring-color': 'var(--input-focus-ring)' } as React.CSSProperties}
          />
          {error && (
            <p className="text-sm text-center" style={{ color: 'var(--error-text)' }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-md font-medium transition-colors disabled:opacity-50 cursor-pointer btn-primary"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      )}

      {hasStaticUsers && socialProviders.length > 0 && (
        <div className="flex items-center gap-3">
          <hr className="flex-grow" style={{ borderColor: 'var(--divider)' }} />
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>or</span>
          <hr className="flex-grow" style={{ borderColor: 'var(--divider)' }} />
        </div>
      )}

      {socialProviders.length > 0 && (
        <div className="flex flex-col gap-3">
          {socialProviders.map((id) => {
            const config = providerConfig[id];
            return (
              <button
                key={id}
                onClick={() => handleSocialSignIn(id)}
                className="w-full py-3 px-4 rounded-md text-white font-medium transition-opacity hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: config.color }}
              >
                {config.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
