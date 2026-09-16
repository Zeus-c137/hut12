export type TransactionType =
  | "deposit"
  | "withdrawal"
  | "registration_bonus"
  | "daily_checkin_bonus"
  | "gift_code"
  | "referral_signup_bonus"
  | "referral_level_income"
  | "vip_task"
  | "product_activation"
  | "daily_yield";

export const TRANSACTION_LABELS: Record<TransactionType, string> = {
  deposit: "Recharge",
  withdrawal: "Withdrawal",
  product_activation: "Product",
  daily_yield: "Yield",
  registration_bonus: "Bonus",
  daily_checkin_bonus: "Check-in",
  gift_code: "Voucher",
  referral_signup_bonus: "Referral",
  referral_level_income: "Referral",
  vip_task: "VIP Task",
};

export const TRANSACTION_ICON_KEYS: Record<TransactionType, string> = {
  deposit: "dollar3d",
  withdrawal: "wallet3d",
  product_activation: "bag3d",
  daily_yield: "fire3d",
  registration_bonus: "medal3d",
  daily_checkin_bonus: "fire3d",
  gift_code: "giftBox3d",
  referral_signup_bonus: "money3d",
  referral_level_income: "money3d",
  vip_task: "trophy3d",
};

export const LEGACY_TO_CANONICAL: Record<string, TransactionType> = {
  deposit: "deposit",
  balance: "deposit",
  manual: "deposit",
  withdrawal: "withdrawal",
  withdraw: "withdrawal",
  gift: "registration_bonus",
  register: "registration_bonus",
  bonus: "registration_bonus",
  reward: "registration_bonus",
  checkin: "daily_checkin_bonus",
  checkin_bonus: "daily_checkin_bonus",
  voucher: "gift_code",
  vip_task: "vip_task",
  gpu: "product_activation",
  gpu_activation: "product_activation",
  subscription: "product_activation",
  yield: "daily_yield",
  daily: "daily_yield",
  "daily accumulation": "daily_yield",
};

export function canonicalTypeOf(rawType: string, metadata?: any): TransactionType | string {
  const lower = String(rawType || "").toLowerCase();
  if (lower === "referral") {
    const lvl = metadata && typeof metadata === "object" ? (metadata as Record<string, any>).level : undefined;
    if (lvl !== undefined && lvl !== null && lvl !== "" && Number.isFinite(Number(lvl)) && Number(lvl) >= 1 && Number(lvl) <= 4) {
      return "referral_level_income";
    }
    return "referral_signup_bonus";
  }
  return LEGACY_TO_CANONICAL[lower] ?? lower;
}

export function migrateLegacyType(rawType: string, metadata?: any): TransactionType {
  const c = canonicalTypeOf(rawType, metadata) as string;
  return (TRANSACTION_LABELS[c as TransactionType] ? (c as TransactionType) : "deposit");
}

export function getTransactionDisplayMeta(type: string, metadata?: any): {
  label: string;
  isProductWithName: boolean;
  productName?: string;
  productId?: string;
  isReferralLevel: boolean;
  level?: number;
} {
  const canonical = canonicalTypeOf(type, metadata) as string;
  const m = (metadata && typeof metadata === "object" ? metadata : {}) as Record<string, any>;
  const isProductWithName = canonical === "product_activation";
  const isReferralLevel = canonical === "referral_level_income";
  return {
    label: TRANSACTION_LABELS[canonical as TransactionType] ?? "Transaction",
    isProductWithName,
    productName: isProductWithName ? String(m.sourceItemName || "") : undefined,
    productId: isProductWithName ? String(m.sourceItemId || "") : undefined,
    isReferralLevel,
    level: isReferralLevel ? Number(m.level) : undefined,
  };
}

const POSITIVE: Record<string, true> = {
  deposit: true,
  registration_bonus: true,
  daily_checkin_bonus: true,
  gift_code: true,
  referral_signup_bonus: true,
  referral_level_income: true,
  vip_task: true,
  daily_yield: true,
};

export function isPositiveTransaction(type: string, metadata?: any): boolean {
  return !!POSITIVE[canonicalTypeOf(type, metadata) as string];
}

const FILTER_MAP: Record<string, (t: string) => boolean> = {
  all: () => true,
  deposit: (t) => t === "deposit",
  withdraw: (t) => t === "withdrawal",
  referral: (t) => t === "referral_signup_bonus" || t === "referral_level_income",
  checkin: (t) => t === "daily_checkin_bonus",
  voucher: (t) => t === "gift_code",
  vip_task: (t) => t === "vip_task",
  product: (t) => t === "product_activation",
  yield: (t) => t === "daily_yield",
};

export function filterByHistoryFilter(transactions: any[], filter: string): any[] {
  const pred = FILTER_MAP[filter] ?? FILTER_MAP.all;
  return transactions.filter((tx) => pred(canonicalTypeOf(tx.type, tx.metadata) as string));
}

export function getWithdrawalDisplayAmounts(tx: any): { fee: number; payout: number; requested: number } {
  const m = (tx.metadata && typeof tx.metadata === "object" ? tx.metadata : {}) as Record<string, any>;
  return {
    fee: Number(m.feeAmount ?? 0),
    payout: Number(m.payoutAmount ?? tx.amount ?? 0),
    requested: Number(m.requestedAmount ?? tx.amount ?? 0),
  };
}

export function isSuccessfulStatus(status: string): boolean {
  return ["SUCCESSFUL", "COMPLETED", "APPROVED"].includes(String(status || "").toUpperCase());
}
