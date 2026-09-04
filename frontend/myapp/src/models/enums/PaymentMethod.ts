/** Mirrors backend `payment/enums/payment-method.enum.ts` */
export const PaymentMethod = {
  COD: 'cod',
  STRIPE: 'stripe',
  JAZZCASH: 'jazzcash',
  EASYPAISA: 'easypaisa',
} as const;

export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];
