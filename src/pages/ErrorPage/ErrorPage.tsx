import { Button, ButtonLink } from "@/components/ui";
import rottenOnion from "./rotten-onion.svg";

export function ErrorPage({ onRetry = () => window.location.reload() }: { onRetry?: () => void }) {
  return (
    <div className="shell">
      <main className="flex flex-1 flex-col items-center justify-center gap-7 px-9 pb-[calc(var(--safe-bottom)+60px)] pt-[calc(var(--safe-top)+24px)] text-center">
        <img src={rottenOnion} width={112} height={112} alt="" aria-hidden="true" data-testid="rotten-onion" />
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-[34px] leading-[38px] tracking-[-0.4px] text-ink">
            Something went wrong
          </h1>
          <p className="text-body leading-[23px] text-ink-body">
            We couldn&apos;t load your kitchen just now. Your recipes, receipts and orders are safe.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2.5 pt-1">
          <Button radius="input" className="!h-12 !text-[14px]/[18px] !shadow-none" onClick={onRetry}>
            Try again
          </Button>
          <ButtonLink to="/dashboard" variant="outline" radius="input" className="!h-12 !text-[14px]/[18px]">
            Back to Dashboard
          </ButtonLink>
          <span className="pt-1.5 text-label font-medium text-ink-muted underline">
            Contact support
          </span>
        </div>
      </main>
    </div>
  );
}
