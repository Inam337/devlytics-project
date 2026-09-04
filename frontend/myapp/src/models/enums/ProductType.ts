/** Mirrors backend `entities/product-type.enum.ts` */
export const ProductType = {
  GOODS: 'goods',
  SERVICE: 'service',
  DIGITAL: 'digital',
} as const;

export type ProductType = (typeof ProductType)[keyof typeof ProductType];
