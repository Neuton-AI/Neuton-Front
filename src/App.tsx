import type React from "react";
import { AuthPage } from "@/pages/AuthPage/AuthPage";
import { LandingPage } from "@/pages/LandingPage/LandingPage";
import { SyncStatus } from "@/features/sync/SyncStatus";
import { useAppChrome } from "@/features/pwa/useAppChrome";
import { Route, Routes } from "react-router-dom";
import { RequireAuth, RootRedirect } from "./AppGate";
import { AuthenticatedRoutes } from "./AppRoutes";

export const App: React.FC = () => {
  useAppChrome();
  return (
    <>
      <SyncStatus />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signin" element={<AuthPage mode="signin" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route
          path="/*"
          element={
            <RequireAuth>
              <AuthenticatedRoutes />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
};
