import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/api';
import { normalizeError, type ErrorContext } from './errors';
import { SyncPopup } from './SyncPopup';

const identity: ErrorContext = {
  scope: { key: 'test:shop', userId: 'test', shopId: 'shop' },
  entity: 'recipe',
  documentId: 'recipe-one',
  operation: 'edit',
  phase: 'push',
  operationId: 'edit-one',
  revision: 1,
};
const errors = [
  normalizeError(new ApiError('sensitive backend message', 403), identity)!,
  normalizeError(new ApiError('private stack', 503), {
    ...identity,
    entity: 'receipt',
    operation: 'upload',
    documentId: 'receipt-two',
    operationId: 'upload-two',
    sourceIndex: 1,
  })!,
];

describe('sync popup', () => {
  it('opens all entity/action failures and recovery controls without rendering diagnostics', () => {
    const retry = vi.fn();
    function Harness() {
      const [opened, setOpened] = useState(false);
      return (
        <SyncPopup
          tone="error"
          title="Recipe · Edit"
          message="Permission denied"
          errors={errors}
          pending={2}
          processing={0}
          online
          opened={opened}
          setOpened={setOpened}
          retry={retry}
          exportPending={async () => {}}
          onSignIn={() => {}}
        />
      );
    }
    render(
      <MemoryRouter>
        <Harness />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Permission denied' }));
    expect(
      screen.getByRole('button', { name: 'Permission denied' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Recipe · Edit')).toBeVisible();
    expect(screen.getByRole('link', { name: 'Ask owner' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Next issue' }));
    expect(screen.getByText('Receipt · Upload')).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent('Server unavailable');
    expect(screen.getByText('File 2')).toBeVisible();
    expect(screen.queryByText(/sensitive|private/)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Retry sync' })[0]);
    expect(retry).toHaveBeenCalledOnce();
  });
  it.each([
    ['success', 'Upload succeeded'],
  ] as const)('announces %s and retains a compact toggle', (tone, message) => {
    render(
      <MemoryRouter>
        <SyncPopup
          tone={tone}
          title="Receipt · Upload"
          message={message}
          errors={[]}
          pending={0}
          processing={0}
          online
          opened={false}
          setOpened={() => {}}
          retry={() => {}}
          exportPending={async () => {}}
          onSignIn={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByRole('status')).toHaveTextContent(message);
    expect(screen.getByRole('button', { name: message })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
  it('marks local persistence failures unsaved with an export action', () => {
    const error = normalizeError(
      new DOMException('quota', 'QuotaExceededError'),
      { ...identity, phase: 'local-persistence', savedLocally: false },
    )!;
    render(
      <MemoryRouter>
        <SyncPopup
          tone="error"
          title="Recipe · Edit"
          message={error.message}
          errors={[error]}
          pending={0}
          processing={0}
          online
          opened
          setOpened={() => {}}
          retry={() => {}}
          exportPending={async () => {}}
          onSignIn={() => {}}
        />
      </MemoryRouter>,
    );
    expect(screen.getByText('Change unsaved')).toBeVisible();
    expect(screen.getAllByRole('button', { name: 'Export work' })).toHaveLength(
      1,
    );
    expect(screen.queryByText(/queued/)).not.toBeInTheDocument();
  });
});
