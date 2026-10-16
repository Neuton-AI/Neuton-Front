import type { ReactNode } from 'react';
type LayoutProps = {
  mainContent: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  className?: string;
};
export function Layout({ mainContent, actions, footer, className = 'shell' }: LayoutProps) {
  return (
    <div className={className}>
      {mainContent}
      {actions}
      {footer}
    </div>
  );
}
