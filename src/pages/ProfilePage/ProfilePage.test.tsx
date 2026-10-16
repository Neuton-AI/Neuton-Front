import { renderWithRouter } from '@/test/render';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { ProfilePage } from './ProfilePage';
import { useProfilePage, type ProfilePageModel } from './ProfilePage.module';
vi.mock('./ProfilePage.module', () => ({ useProfilePage: vi.fn() }));
it('renders account status and forwards tab and sign-out actions', async () => {
  const model: ProfilePageModel = {
    role: undefined,
    handleSelectShop: vi.fn(),
    handleSaved: vi.fn(),
    user: null,
    token: null,
    memberships: [],
    activeShopId: null,
    activeShop: null,
    tab: 'me',
    setTab: vi.fn(),
    notice: 'Shop ready',
    setNotice: vi.fn(),
    signOut: vi.fn(),
    createShop: vi.fn(),
    createShopPending: false,
  };
  vi.mocked(useProfilePage).mockReturnValue(model);
  renderWithRouter(<ProfilePage />);
  const user = userEvent.setup();
  expect(screen.getByText('Shop ready')).toBeInTheDocument();
  await user.click(screen.getByRole('tab', { name: 'shop' }));
  expect(model.setTab).toHaveBeenCalledWith('shop');
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(model.signOut).toHaveBeenCalledOnce();
});
