import type React from "react";
export const AuthConfiguration: React.FC = () => {
  return (
    <div className="shell px-6 py-10">
      <h1 className="font-display text-title text-ink">Configuration needed</h1>
      <p className="mt-2 text-body text-ink-muted">
        Add <code className="font-mono">VITE_SUPABASE_URL</code> and{" "}
        <code className="font-mono">VITE_SUPABASE_ANON_KEY</code> to your{" "}
        <code className="font-mono">.env</code> file, then restart the dev
        server.
      </p>
    </div>
  );
};
