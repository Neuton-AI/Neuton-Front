import { useShopAccountSearch, type InviteRole, type ShopAccountMatch } from "@/features/shops/shopTeamApi";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

export type InviteTeammateSheetProps = {
  userId: string;
  shopId: string;
  shopName: string;
  onClose: () => void;
  onInvite: (accountId: string, role: InviteRole) => Promise<void>;
};

export function useInviteTeammateSheet({ userId, shopId, onClose, onInvite }: InviteTeammateSheetProps) {
  const [input, setInput] = useState("");
  const [page, setPage] = useState(1);
  const [account, setAccount] = useState<ShopAccountMatch | null>(null);
  const [role, setRole] = useState<InviteRole>("member");
  const closeRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const roleRef = useRef<HTMLInputElement>(null);
  const query = input.trim();
  const debouncedQuery = useDebouncedValue(query);
  const settled = query === debouncedQuery;
  const search = useShopAccountSearch(userId, shopId, debouncedQuery, page, Boolean(query) && settled && !account);
  const invite = useMutation({ mutationFn: ({ id, role }: { id: string; role: InviteRole }) => onInvite(id, role) });
  const inviting = invite.isPending;

  useEffect(() => {
    const trigger = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, []);

  useEffect(() => {
    if (account) roleRef.current?.focus();
  }, [account]);

  const close = useCallback(() => {
    if (!inviting) onClose();
  }, [inviting, onClose]);

  function selectAccount(candidate: ShopAccountMatch) {
    setAccount(candidate);
    setRole("member");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!account || inviting) return;
    invite.mutate({ id: account.id, role }, { onSuccess: onClose });
  }

  function backToSearch() {
    invite.reset();
    setAccount(null);
    requestAnimationFrame(() => searchRef.current?.focus());
  }

  function changeInput(value: string) {
    setInput(value);
    setPage(1);
  }

  function changePage(nextPage: number) {
    setPage(nextPage);
    searchRef.current?.focus();
  }

  const results = settled ? search.data : undefined;
  return {
    account, role, setRole, selectAccount, input, changeInput, page, changePage, results,
    closeRef, searchRef, roleRef, close, submit, backToSearch, inviting, inviteFailed: invite.isError,
    searchFailed: Boolean(query) && settled && search.isError,
    searching: Boolean(query) && (!settled || search.isFetching) && !results,
    retry: () => void search.refetch(),
  };
}
