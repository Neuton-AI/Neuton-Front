import { Button } from '@/components/ui';

export function AuthSocial() {
  return (
    <>
      <div className="mt-6 flex items-center gap-3 text-label text-ink-muted">
        <div className="h-[1px] flex-1 bg-hairline" />
        <span>or continue with</span>
        <div className="h-[1px] flex-1 bg-hairline" />
      </div>
      <div className="mt-4 flex gap-3">
        <Button type="button" variant="outline" size="lg" radius="card" block className="h-[54px] flex-1 text-[16px] font-bold text-ink">
          Google
        </Button>
        <Button type="button" variant="outline" size="lg" radius="card" block className="h-[54px] flex-1 text-[16px] font-bold text-ink">
          Apple
        </Button>
      </div>
    </>
  );
}
