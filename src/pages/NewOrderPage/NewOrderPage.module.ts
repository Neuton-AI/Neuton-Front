import { validateFields } from '@/components/FormFields/schema';
import { useAuth, useCurrentShop, useShopMemberships } from '@/features/auth/auth';
import { useCreateOrder } from '@/features/orders/ordersApi';
import { orderReviewDetails } from '@/features/orders/reviewConflict';
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { orderDateTimestamp, validOrderDate } from './orderForm';
import { useOrderDraft } from './useOrderDraft';
import { useOrderForm } from './useOrderForm';

export function useNewOrderPage() {
  const { user, userId, loading: authLoading } = useAuth();
  const { memberships, activeShopId, loading: shopsLoading } = useShopMemberships(user?.id);
  const shop = useCurrentShop(memberships, activeShopId);
  const scope = JSON.stringify([userId, activeShopId]);
  const activeScope = useRef(scope);
  activeScope.current = scope;
  const draft = useOrderDraft(userId, activeShopId);
  const form = useOrderForm(scope, shop);
  const navigate = useNavigate();
  const createOrder = useCreateOrder(userId, activeShopId);
  const submitting = useRef(false);
  const [review, setReview] = useState<{ scope: string; revision: string } | null>(null);
  const reviewOpen = review?.scope === scope;
  const revision = JSON.stringify([draft.revision, form.formValues, shop?.timezone, shop?.currency]);
  const cancelReview = useCallback(() => setReview(null), []);
  const [failure, setFailure] = useState({ scope, message: '' });
  const submitError = failure.scope === scope ? failure.message : '';
  const setError = (message: string) => setFailure({ scope, message });
  const fee = Number(form.formValues.deliveryFee);
  const safeFee = Number.isFinite(fee) && fee >= 0 ? fee : 0;
  const available = draft.lines.filter(line => line.available);
  const totalCost = available.reduce((sum, line) => sum + Number(line.unitCost) * line.quantity, 0);
  const netProfitCents = available.filter(line => line.costComplete).reduce((sum, line) =>
    sum + (Math.round(Number(line.unitPrice) * 100) - Number(line.unitCost) * 100) * line.quantity, 0);
  const quote = draft.lines.length > 0 ? {
    totalAmount: (Math.round(draft.subtotal * 100) + Math.round(safeFee * 100)) / 100,
    deliveryFee: safeFee, totalCost, netProfit: netProfitCents / 100,
    profitMarginPercent: draft.subtotal > 0 ? netProfitCents / draft.subtotal : 0,
  } : null;
  const save = async (confirmedUnavailableRecipeIds?: string[]) => {
    if (!userId || !activeShopId || draft.lines.length === 0 || submitting.current) return;
    if (draft.availableCount === 0) { setError('No available items to save'); return; }
    const invalidField = Object.values(validateFields(form.fields, form.formValues))[0];
    if (invalidField) { setError(invalidField); return; }
    if (!/^(0|[1-9]\d{0,7})(\.\d{1,2})?$/.test(form.formValues.deliveryFee)) {
      setError('Enter a valid delivery fee with at most two decimal places.'); return;
    }
    if (!validOrderDate(form.formValues.orderDate) || !validOrderDate(form.formValues.deliveryDate)) {
      setError('Enter valid order and delivery dates.'); return;
    }
    if (draft.lines.some(line => line.pricingPending)) { setError('Recipe pricing requires a synced costing snapshot.'); return; }
    setError('');
    if (draft.unavailableIds.length > 0 && !confirmedUnavailableRecipeIds) {
      setReview({ scope, revision });
      return;
    }
    submitting.current = true;
    try {
      const values = form.formValues;
      const result = await createOrder.mutateAsync({
        customerName: values.customerName.trim(), destinationAddress: values.destinationAddress.trim(),
        orderDate: orderDateTimestamp(values.orderDate, shop?.timezone ?? 'UTC'),
        deliveryDate: values.deliveryDate, deliveryFee: values.deliveryFee,
        items: draft.lines.map(line => ({ recipeId: line.recipeId, quantity: line.quantity, expectedUnitPrice: line.unitPrice })),
        ...(confirmedUnavailableRecipeIds ? { confirmedUnavailableRecipeIds } : {}),
      });
      if (activeScope.current !== scope) return;
      draft.clear();
      navigate(`/orders/${result.order.id}`, { state: { fresh: true } });
    } catch (cause) {
      if (activeScope.current !== scope) return;
      const review = orderReviewDetails(cause);
      if (review) draft.applyReview(review);
      setError(cause instanceof Error ? cause.message : 'Could not save the order.');
    } finally {
      submitting.current = false;
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reviewOpen) return save();
  };
  const confirmReview = () => {
    if (!reviewOpen) return;
    cancelReview();
    if (review.revision !== revision) {
      setError('The order changed. Review the updated items and save again.');
      return;
    }
    return save(draft.unavailableIds);
  };
  const itemsError = submitError || draft.error?.message;
  return {
    ...form, ...draft, authLoading, shopsLoading, activeShopId, draftScope: scope,
    currency: shop?.currency ?? 'USD', itemsError, quote,
    quoteSubtotal: draft.subtotal, draftDeliveryFee: safeFee, submit, reviewOpen, cancelReview, confirmReview,
    createOrderPending: createOrder.isPending, handleBack: () => navigate('/orders'),
  };
}
export type NewOrderPageModel = ReturnType<typeof useNewOrderPage>;

export function useNewOrderLayout() {
  const model = useNewOrderPage();
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
    if (model.formDirty || model.lines.length > 0) {
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
