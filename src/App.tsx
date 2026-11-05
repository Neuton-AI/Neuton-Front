import type React from "react";
import { AuthPage } from "@/pages/AuthPage/AuthPage";
import { LandingPage } from "@/pages/LandingPage/LandingPage";
import { SyncStatus } from "@/features/sync/SyncStatus";
import { useAppChrome } from "@/features/pwa/useAppChrome";
import { Route, Routes } from "react-router-dom";
import { RequireAuth, RootRedirect } from "./AppGate";
import { AuthenticatedRoutes } from "./AppRoutes";
import { ConfirmEmailPage } from "@/pages/ConfirmEmailPage/ConfirmEmailPage";
import { LegacyDataNotice } from "@/features/sync/LegacyDataNotice";
import { RecoveryPage } from "@/pages/RecoveryPage/RecoveryPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage/ResetPasswordPage";
import { GoogleCompletePage } from "@/pages/GoogleCompletePage/GoogleCompletePage";

export const App: React.FC = () => {
  useAppChrome();
  return (
    <>
      <LegacyDataNotice />
      <SyncStatus />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/signin" element={<AuthPage mode="signin" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/auth/confirm" element={<ConfirmEmailPage />} />
        <Route path="/forgot-password" element={<RecoveryPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/google/complete" element={<GoogleCompletePage />} />
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
