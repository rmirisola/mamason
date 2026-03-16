import { OrderStatus } from "@prisma/client";

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  created: ["fulfillment_pending"],
  fulfillment_pending: ["ordering_from_amazon", "fulfillment_failed"],
  fulfillment_failed: ["fulfillment_pending", "ordering_from_amazon", "ordered_on_amazon"],
  ordering_from_amazon: ["ordered_on_amazon", "fulfillment_failed"],
  ordered_on_amazon: ["shipped_to_warehouse"],
  shipped_to_warehouse: ["received_at_warehouse"],
  received_at_warehouse: ["shipped_to_venezuela"],
  shipped_to_venezuela: ["in_transit_venezuela"],
  in_transit_venezuela: ["delivered"],
  delivered: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionOrder(current: OrderStatus, desired: OrderStatus): OrderStatus {
  if (!canTransition(current, desired)) {
    throw new Error(`Invalid transition: ${current} → ${desired}`);
  }
  return desired;
}

const ZINC_STATUS_MAP: Record<string, OrderStatus> = {
  pending: "ordering_from_amazon",
  in_progress: "ordering_from_amazon",
  order_placed: "ordered_on_amazon",
  shipped: "shipped_to_warehouse",
  delivered: "received_at_warehouse",
  failed: "fulfillment_failed",
};

export function mapZincStatus(zincStatus: string): OrderStatus | null {
  return ZINC_STATUS_MAP[zincStatus] ?? null;
}

/** States where we should still poll Zinc for updates */
const ACTIVE_FULFILLMENT_STATES: OrderStatus[] = [
  "fulfillment_pending",
  "fulfillment_failed",
  "ordering_from_amazon",
  "ordered_on_amazon",
  "shipped_to_warehouse",
];

export function isActiveFulfillmentState(status: OrderStatus): boolean {
  return ACTIVE_FULFILLMENT_STATES.includes(status);
}
