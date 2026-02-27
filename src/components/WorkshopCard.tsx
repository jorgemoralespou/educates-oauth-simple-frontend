"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

interface WorkshopCardProps {
  title: string;
  description: string;
  workshopName: string;
  isAuthenticated: boolean;
  loginUrl: string;
  autoLaunch?: boolean;
  image?: string;
  difficulty?: "beginner" | "intermediate" | "advanced";
  duration?: string;
  returnPath?: string;
}

export function WorkshopCard({ title, description, workshopName, isAuthenticated, loginUrl, autoLaunch, image, difficulty, duration, returnPath }: WorkshopCardProps) {
  const [loading, setLoading] = useState(false);
  const launched = useRef(false);

  const handleStartWorkshop = async () => {
    if (!isAuthenticated) {
      window.location.href = loginUrl;
      return;
    }

    setLoading(true);
    try {
      const url = returnPath
        ? `/api/workshops/${encodeURIComponent(workshopName)}?returnPath=${encodeURIComponent(returnPath)}`
        : `/api/workshops/${encodeURIComponent(workshopName)}`;
      const res = await fetch(url);
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
    <div
      className="rounded-lg border shadow-sm overflow-hidden flex flex-col"
      style={{ backgroundColor: "var(--card-bg)", borderColor: "var(--card-border)" }}
    >
      {image && (
        <div className="relative w-full h-36 bg-gray-100">
          <Image src={image} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className="p-6 flex flex-col flex-grow">
        <div className="flex items-center gap-2 mb-2">
          {difficulty && (
            <span className={`badge badge-${difficulty}`}>{difficulty}</span>
          )}
          {duration && (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{duration}</span>
          )}
        </div>
        <h2 className="text-lg font-semibold mb-1">{title}</h2>
        <p className="mb-4 flex-grow text-sm" style={{ color: "var(--text-secondary)" }}>{description}</p>
        <button
          onClick={handleStartWorkshop}
          disabled={loading}
          className="py-2.5 px-4 rounded-md font-medium transition-colors disabled:opacity-50 cursor-pointer btn-primary"
        >
          {loading ? "Starting..." : "Start Workshop"}
        </button>
      </div>
    </div>
  );
}
