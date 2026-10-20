import { BottomNav } from '@/components/BottomNav/BottomNav';
import { InlineNotice } from '@/components/feedback';
import { IconLogout } from '@/components/icons';
import { Layout } from '@/components/Layout/Layout';
import { PageHeader } from '@/components/PageHeader/PageHeader';
import { InstallAppButton } from '@/features/pwa/InstallApp';
import { MeTab } from './MeTab/MeTab';
import { useProfilePage } from './ProfilePage.module';
import { ShopTab } from './ShopTab/ShopTab';

export function ProfilePage() {
  const {
    role,
    handleSelectShop,
    handleSaved,
    user,
    token,
    memberships,
    activeShopId,
    activeShop,
    tab,
    setTab,
    notice,
    setNotice,
    signOut,
    createShop,
    createShopPending,
  } = useProfilePage();
  return (
    <Layout
      className="shell"
      mainContent={
        <div className="flex-1 px-4 pb-32 pt-[max(var(--safe-top)+44px,44px)]">
          <PageHeader
            eyebrow="Account & shop"
            title="Profile"
            action={
              tab === 'me' ? (
                <div className="pt-5">
                  <InstallAppButton />
                </div>
              ) : undefined
            }
          />

          <div
            role="tablist"
            aria-label="Profile section"
            className="mt-3 flex gap-1 rounded-card border border-hairline bg-surface-soft p-1"
          >
            {(['me', 'shop'] as const).map((key) => (
              <button
                key={key}
                role="tab"
                type="button"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`flex-1 rounded-input px-3.5 py-2 text-body font-medium capitalize transition-colors duration-200 ${
                  tab === key ? 'bg-surface-card text-ink' : 'text-ink-muted'
                }`}
              >
                {key}
              </button>
            ))}
          </div>

          <div className="mt-3">
            {tab === 'me' ? (
              <MeTab
                email={user?.email ?? '—'}
                memberships={memberships}
                activeShopId={activeShopId}
                creating={createShopPending}
                onSelectShop={handleSelectShop}
                onCreateShop={(name) => void createShop(name)}
              />
            ) : (
              <ShopTab
                token={token}
                shopId={activeShopId}
                role={role}
                fallbackName={activeShop?.name}
                onSaved={handleSaved}
                onNotice={setNotice}
              />
            )}
          </div>

          {notice ? <InlineNotice tone="success">{notice}</InlineNotice> : null}

          <button
            type="button"
            onClick={() => void signOut()}
            className="pressable mt-5 flex w-full items-center justify-center gap-2 rounded-pill border border-hairline py-3 text-body font-medium text-ink"
          >
            <IconLogout className="h-5 w-5" />
            Sign out
          </button>
        </div>
      }
      footer={<BottomNav />}
    />
  );
}
