"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm header-link-muted">{name}</span>
      <button
        onClick={handleSignOut}
        className="text-sm font-medium transition-colors cursor-pointer header-link-muted"
      >
        Sign out
      </button>
    </div>
  );
}
