/** Mirrors backend `payment/enums/payment-status.enum.ts` */
export const PaymentStatus = {
  PENDING: 'pending',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const;

export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];
