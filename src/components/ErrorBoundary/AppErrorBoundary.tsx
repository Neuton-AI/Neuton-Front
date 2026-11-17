import { ErrorPage } from "@/pages/ErrorPage/ErrorPage";
import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { useAppErrorBoundaryLocation } from "./AppErrorBoundary.module";
import { reportRenderError } from "./reportRenderError";

type BoundaryProps = PropsWithChildren<{ location: ReturnType<typeof useAppErrorBoundaryLocation> }>;
type BoundaryState = { hasError: boolean; locationKey: string };

class RenderErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false, locationKey: this.props.location.key };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps({ location }: BoundaryProps, state: BoundaryState): BoundaryState | null {
    if (location.key === state.locationKey) return null;
    return { hasError: false, locationKey: location.key };
  }

  componentDidCatch(_error: Error, { componentStack }: ErrorInfo) {
    reportRenderError(this.props.location.pathname, componentStack);
  }

  render() {
    if (this.state.hasError) return <ErrorPage />;
    return this.props.children;
  }
}

export function AppErrorBoundary({ children }: PropsWithChildren) {
  const location = useAppErrorBoundaryLocation();
  return <RenderErrorBoundary location={location}>{children}</RenderErrorBoundary>;
}
