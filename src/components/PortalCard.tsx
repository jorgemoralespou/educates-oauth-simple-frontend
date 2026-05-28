"use client";

interface PortalCardProps {
  title: string;
  description: string;
  workshopName: string;
  loading: boolean;
  onStart: () => void;
}

export function PortalCard({
  title,
  description,
  loading,
  onStart,
}: PortalCardProps) {
  return (
    <div className="rounded-lg border shadow-sm p-6 flex flex-col" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--card-border)' }}>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-lg font-semibold">{title}</h2>
      </div>
      <p className="mb-4 flex-grow" style={{ color: 'var(--text-secondary)' }}>{description}</p>
      <button
        onClick={onStart}
        disabled={loading}
        className="py-2.5 px-4 rounded-md font-medium transition-colors disabled:opacity-50 cursor-pointer btn-primary"
      >
        {loading ? "Starting..." : "Start workshop"}
      </button>
    </div>
  );
}
