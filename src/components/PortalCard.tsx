"use client";

import { useState, useEffect, useRef } from "react";

interface PortalCardProps {
  title: string;
  description: string;
  workshopName: string;
  isAuthenticated: boolean;
  loginUrl: string;
  autoLaunch?: boolean;
}

export function PortalCard({ title, description, workshopName, isAuthenticated, loginUrl, autoLaunch }: PortalCardProps) {
  const [loading, setLoading] = useState(false);
  const launched = useRef(false);

  const handleStartWorkshop = async () => {
    if (!isAuthenticated) {
      window.location.href = loginUrl;
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/workshops/${encodeURIComponent(workshopName)}`);
      const data = await res.json();
      if (data.sessionActivationUrl) {
        window.location.href = data.sessionActivationUrl;
      } else {
        alert(data.error || "Failed to start workshop");
        setLoading(false);
      }
    } catch {
      alert("Failed to start workshop");
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoLaunch && isAuthenticated && !launched.current) {
      launched.current = true;
      handleStartWorkshop();
    }
  }, [autoLaunch, isAuthenticated]);

  return (
    <div className="rounded-lg border shadow-sm p-6 flex flex-col" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mb-4 flex-grow" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      <button
        onClick={handleStartWorkshop}
        disabled={loading}
        className="py-2.5 px-4 rounded-md font-medium transition-colors disabled:opacity-50 cursor-pointer btn-primary"
      >
        {loading ? "Starting..." : "Start workshop"}
      </button>
    </div>
  );
}
