import type React from "react";
import { FullPageLoader } from "@/components/feedback";
import { LandingPage } from "@/pages/LandingPage/LandingPage";
import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useRequireAuth, useRootRedirect } from "./AppGate.module";

export const RootRedirect: React.FC = () => {
  const { session, loading } = useRootRedirect();
  if (loading) return <FullPageLoader />;
  if (session) return <Navigate to="/dashboard" replace />;
  return <LandingPage />;
};

interface IRequireAuth {
  children: ReactElement;
}

export const RequireAuth: React.FC<IRequireAuth> = ({ children }) => {
  const { session, loading, from } = useRequireAuth();
  if (loading) return <FullPageLoader />;
  if (!session) return <Navigate to="/signin" replace state={{ from }} />;
  return children;
};
