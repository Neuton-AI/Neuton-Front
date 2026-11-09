import type React from "react";
import { AuthPage } from "@/pages/AuthPage/AuthPage";
import { GoogleCompletionPage } from "@/pages/AuthPage/GoogleCompletionPage";
import { googleCompletionPath } from "@/features/auth/google-return";
import { LandingPage } from "@/pages/LandingPage/LandingPage";
import { SyncStatus } from "@/features/sync/SyncStatus";
import { useAppChrome } from "@/features/pwa/useAppChrome";
import { Route, Routes, useMatch } from "react-router-dom";
import { RequireAuth, RootRedirect } from "./AppGate";
import { AuthenticatedRoutes } from "./AppRoutes";

export const App: React.FC = () => {
  useAppChrome();
  const completingGoogle = useMatch({ path: googleCompletionPath, caseSensitive: true });
  return (
    <>
      {!completingGoogle && <SyncStatus />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signin" element={<AuthPage mode="signin" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path={googleCompletionPath} caseSensitive element={<GoogleCompletionPage />} />
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
