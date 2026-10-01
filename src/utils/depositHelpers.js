export const createIdempotencyKey = (walletId = "wallet", randomValue) => {
  const random = randomValue || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `admin-deposit-${walletId}-${random}`;
};

export const normalizeDeposit = (deposit) => {
  const detail = deposit.detail || {};
  const gateway = detail.gatewayResponse || detail.paymentGatewayResponse || {};
  const breakdown = detail.amountBreakdown || {};
  const paymentId = gateway.cf_payment_id || gateway.paymentId || gateway.transaction_id || null;
  const reference = detail.orderId || deposit.orderId || deposit.reference || "—";

  return {
    id: deposit._id || deposit.transactionId,
    source: deposit,
    dealerName: deposit.dealer?.name || detail.dealer?.shopName || detail.dealer?.ownerName || "N/A",
    amount: deposit.amount ?? detail.amount ?? 0,
    depositType: paymentId ? "Online Top-up" : "Admin Deposit",
    status: deposit.status || detail.status || "—",
    createdAt: deposit.createdAt || detail.createdAt,
    reference,
    gatewayOrderId: paymentId ? reference : null,
    gatewayPaymentId: paymentId,
    balanceBefore: breakdown.preBalance ?? detail.preBalance ?? deposit.preBalance,
    balanceAfter: breakdown.postBalance ?? detail.postBalance ?? deposit.postBalance,
  };
};
