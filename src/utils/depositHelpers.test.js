import { createIdempotencyKey, normalizeDeposit } from "./depositHelpers";
import { getDateRangeParams } from "./financeHelpers";

describe("Admin wallet deposits", () => {
  test("builds a stable retry-safe idempotency key from the selected wallet", () => {
    expect(createIdempotencyKey("dealer-42", "request-1")).toBe("admin-deposit-dealer-42-request-1");
  });

  test("normalizes an admin ledger deposit with balance before and after", () => {
    expect(normalizeDeposit({
      _id: "ledger-1",
      amount: 250,
      status: "APPROVED",
      orderId: "RECEIPT-99",
      dealer: { name: "Speed Motors" },
      detail: { amountBreakdown: { preBalance: 1000, postBalance: 1250 } },
    })).toMatchObject({
      id: "ledger-1",
      dealerName: "Speed Motors",
      amount: 250,
      depositType: "Admin Deposit",
      reference: "RECEIPT-99",
      balanceBefore: 1000,
      balanceAfter: 1250,
    });
  });

  test("shows gateway identifiers when a gateway payment exists", () => {
    expect(normalizeDeposit({
      _id: "ledger-2",
      orderId: "CF-ORDER-1",
      detail: { gatewayResponse: { cf_payment_id: "CF-PAY-1" } },
    })).toMatchObject({
      depositType: "Online Top-up",
      gatewayOrderId: "CF-ORDER-1",
      gatewayPaymentId: "CF-PAY-1",
    });
  });

  test("converts transaction date presets to API query dates", () => {
    expect(getDateRangeParams("7d", new Date(2026, 8, 17))).toEqual({ from: "2026-09-10", to: "2026-09-17" });
    expect(getDateRangeParams("all", new Date(2026, 8, 17))).toEqual({});
  });
});
