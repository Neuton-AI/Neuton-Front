import { validateFields } from '@/components/FormFields/schema';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/auth';
import { useCreateOrder, useOrderForEdit, useUpdateOrder } from '@/features/orders/ordersApi';
import type { OrderEditSnapshot, UpdateOrderBody } from '@/features/orders/types';
import { orderReviewDetails } from '@/features/orders/reviewConflict';
import { recipesKeys } from '@/features/recipes/keys';
import { syncDocuments } from '@/features/sync/engine';
import { scopeFor } from '@/features/sync/types';
import { ApiError } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { earlyDeliveryDateMessage, orderDateTimestamp, validOrderDate } from './orderForm';
import { useOrderDraft } from './useOrderDraft';
import { useOrderForm } from './useOrderForm';

export function useEditOrderEntry() {
  const { id = '' } = useParams();
  const { user, userId, sessionId, loading } = useAuth();
  const { memberships, activeShopId, loading: shopsLoading } = useShopMemberships(user?.id);
  const role = memberships.find(membership => membership.shopId === activeShopId)?.role;
  const canEdit = role === 'owner' || role === 'admin';
  const query = useOrderForEdit(userId, activeShopId, id, canEdit);
  let message = 'Only processing orders can be edited.';
  if (!canEdit) message = 'Only shop owners and admins can edit orders.';
  else if (query.error) message = query.error.message;
  return {
    loading: loading || shopsLoading || (canEdit && query.isPending),
    snapshot: canEdit && query.data?.order.status === 'processing' ? query.data : undefined,
    editorKey: JSON.stringify([sessionId, activeShopId, id]),
    message,
    retry: query.error ? () => void query.refetch() : undefined,
    detailPath: `/orders/${id}`,
  };
}

export function useNewOrderPage(edit?: OrderEditSnapshot) {
  const { user, userId, sessionId, loading: authLoading } = useAuth();
  const { memberships, activeShopId, loading: shopsLoading } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const scope = JSON.stringify([userId, activeShopId, edit?.order.id]);
  const activeScope = useRef({ scope, sessionId });
  if (activeScope.current.scope !== scope || activeScope.current.sessionId !== sessionId) {
    activeScope.current = { scope, sessionId };
  }
  const scopeToken = activeScope.current;
  const draft = useOrderDraft(userId, activeShopId, edit?.order);
  const form = useOrderForm(scope, shop, edit?.order);
  const navigate = useNavigate();
  const { state } = useLocation();
  const fromOrderDetail = (state as { fromOrderDetail?: boolean } | null)?.fromOrderDetail === true;
  const returnToOrder = (id: string) => {
    if (fromOrderDetail) navigate(-1);
    else navigate(`/orders/${id}`, { replace: true });
  };
  const createOrder = useCreateOrder(userId, activeShopId);
  const updateOrder = useUpdateOrder(userId, activeShopId);
  const queryClient = useQueryClient();
  const submitting = useRef<typeof scopeToken | null>(null);
  const lastUpdate = useRef<{ signature: string; mutationId: string; version: number } | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const [review, setReview] = useState<{ token: typeof scopeToken; revision: string } | null>(null);
  const revision = JSON.stringify([draft.revision, form.formValues, shop?.timezone, shop?.currency]);
  const cancelReview = useCallback(() => setReview(null), []);
  const [failure, setFailure] = useState({ scope, message: '' });
  const submitError = failure.scope === scope ? failure.message : '';
  const setError = (message: string) => setFailure({ scope, message });
  const reviewOpen = review?.token === scopeToken && review.revision === revision;
  if (review && !reviewOpen) {
    setReview(null);
    if (review.token === scopeToken) setError('The order changed. Review the updated items and save again.');
  }
  const fee = Number(form.formValues.deliveryFee);
  const safeFee = Number.isFinite(fee) && fee >= 0 ? fee : 0;
  const { orderDate, deliveryDate } = form.formValues;
  const datesAreValid = validOrderDate(orderDate) &&
    (validOrderDate(deliveryDate) || Boolean(edit && !deliveryDate && !form.initialValues.deliveryDate));
  const datesChanged = !edit || orderDate !== form.initialValues.orderDate || deliveryDate !== form.initialValues.deliveryDate;
  const deliveryDateError = datesChanged && datesAreValid && deliveryDate && deliveryDate < orderDate ? earlyDeliveryDateMessage : '';
  const save = async (confirmedUnavailableRecipeIds?: string[]) => {
    if (!userId || !activeShopId || draft.lines.length === 0 || submitting.current === scopeToken) return;
    if (draft.availableCount === 0) { setError('No available items to save'); return; }
    const invalidField = Object.values(validateFields(form.fields, form.formValues))[0];
    if (invalidField) { setError(invalidField); return; }
    if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(form.formValues.deliveryFee)) {
      setError('Enter a valid delivery fee with at most two decimal places.'); return;
    }
    if (!datesAreValid) {
      setError('Enter valid order and delivery dates.');
      return;
    }
    if (deliveryDateError) {
      setError('');
      return;
    }
    if (draft.lines.some(line => line.pricingPending)) { setError('Recipe pricing requires a synced costing snapshot.'); return; }
    setError('');
    if (draft.unavailableIds.length > 0 && !confirmedUnavailableRecipeIds) {
      setReview({ token: scopeToken, revision });
      return;
    }
    submitting.current = scopeToken;
    try {
      const values = form.formValues;
      if (edit) {
        const body: UpdateOrderBody = {
          deliveryFee: values.deliveryFee,
          items: draft.lines.map(line => line.lineId
            ? { lineId: line.lineId, quantity: line.quantity }
            : { recipeId: line.recipeId, quantity: line.quantity, expectedUnitPrice: line.unitPrice }),
          ...(confirmedUnavailableRecipeIds ? { confirmedUnavailableRecipeIds } : {}),
        };
        if (values.customerName.trim() !== form.initialValues.customerName) body.customerName = values.customerName.trim();
        if (values.destinationAddress.trim() !== form.initialValues.destinationAddress) body.destinationAddress = values.destinationAddress.trim();
        if (orderDate !== form.initialValues.orderDate) body.orderDate = orderDateTimestamp(orderDate, shop?.timezone ?? 'UTC');
        if (deliveryDate !== form.initialValues.deliveryDate) body.deliveryDate = deliveryDate || null;
        const signature = JSON.stringify([scope, edit.syncVersion, body]);
        if (lastUpdate.current?.signature !== signature) {
          lastUpdate.current = { signature, mutationId: crypto.randomUUID(), version: Math.max(Date.now(), edit.syncVersion + 1) };
        }
        const { mutationId, version } = lastUpdate.current;
        await updateOrder.mutateAsync({ id: edit.order.id, body, baseVersion: edit.syncVersion, mutationId, version });
        if (mounted.current && activeScope.current === scopeToken) returnToOrder(edit.order.id);
        return;
      }
      const result = await createOrder.mutateAsync({
        customerName: values.customerName.trim(), destinationAddress: values.destinationAddress.trim(),
        orderDate: orderDateTimestamp(values.orderDate, shop?.timezone ?? 'UTC'),
        deliveryDate: values.deliveryDate, deliveryFee: values.deliveryFee,
        items: draft.lines.map(line => ({ recipeId: line.recipeId, quantity: line.quantity, expectedUnitPrice: line.unitPrice })),
        ...(confirmedUnavailableRecipeIds ? { confirmedUnavailableRecipeIds } : {}),
      });
      if (!mounted.current || activeScope.current !== scopeToken) return;
      draft.clear();
      navigate(`/orders/${result.order.id}`, { state: { fresh: true } });
    } catch (cause) {
      if (!mounted.current || activeScope.current !== scopeToken) return;
      const corrections = orderReviewDetails(cause);
      if (corrections) draft.applyReview(corrections);
      const noAvailable = cause instanceof ApiError && cause.status === 409 && cause.code === 'NO_AVAILABLE_ITEMS';
      if (corrections || noAvailable) {
        const partition = scopeFor(userId, activeShopId);
        void syncDocuments(partition, { userId, shopId: activeShopId }, { force: true, queueIfRunning: true, sessionId })
          .catch(() => undefined)
          .then(() => {
            if (activeScope.current === scopeToken) {
              void queryClient.invalidateQueries({ queryKey: recipesKeys.recipes(activeShopId) });
            }
          });
      }
      if (noAvailable) {
        setError('No available items to save');
      } else {
        setError(cause instanceof Error ? cause.message : 'Could not save the order.');
      }
    } finally {
      if (submitting.current === scopeToken) submitting.current = null;
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reviewOpen) return save();
  };
  const confirmReview = () => {
    if (!reviewOpen) return;
    cancelReview();
    return save(draft.unavailableIds);
  };
  const itemsError = submitError || draft.error?.message;
  return {
    ...form, ...draft, authLoading, shopsLoading, activeShopId, draftScope: scope,
    currency: shop?.currency ?? 'USD', itemsError, deliveryDateError,
    draftDeliveryFee: safeFee, submit, reviewOpen, cancelReview, confirmReview,
    createOrderPending: createOrder.isPending || updateOrder.isPending,
    handleBack: () => {
      if (edit) returnToOrder(edit.order.id);
      else navigate('/orders');
    },
  };
}
export type NewOrderPageModel = ReturnType<typeof useNewOrderPage>;

export function useNewOrderLayout(edit?: OrderEditSnapshot) {
  const model = useNewOrderPage(edit);
  const [discardScope, setDiscardScope] = useState<string | null>(null);
  const confirmDiscard = discardScope !== null && discardScope === model.draftScope;
  const closeRef = useRef<HTMLButtonElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const restoreSaveFocus = useRef(false);
  useLayoutEffect(() => {
    if (contentRef.current) contentRef.current.inert = confirmDiscard || model.reviewOpen;
    if (model.reviewOpen) restoreSaveFocus.current = true;
    if (!confirmDiscard && !model.reviewOpen && !model.createOrderPending && restoreSaveFocus.current) {
      restoreSaveFocus.current = false;
      saveRef.current?.focus({ preventScroll: true });
    }
  }, [confirmDiscard, model.reviewOpen, model.createOrderPending]);
  useEffect(() => {
    restoreSaveFocus.current = false;
  }, [model.draftScope]);
  const cancelDiscard = () => {
    setDiscardScope(null);
    if (contentRef.current) contentRef.current.inert = false;
    closeRef.current?.focus();
  };
  const close = () => {
    if (model.createOrderPending) return;
    if (model.formDirty || model.itemsDirty) {
      setDiscardScope(model.draftScope);
      return;
    }
    model.handleBack();
  };
  const discard = () => {
    model.clear();
    model.handleBack();
  };
  return { model, confirmDiscard,
    closeRef, saveRef, contentRef, cancelDiscard, close, discard };
}
