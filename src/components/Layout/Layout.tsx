import type React from "react";
import type { ReactNode } from "react";
interface ILayout {
  mainContent: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
}
export const Layout: React.FC<ILayout> = ({
  mainContent,
  actions,
  footer,
  className = "shell",
}) => {
  return (
    <div className={className}>
      {mainContent}
      {actions}
      {footer}
    </div>
  );
};
