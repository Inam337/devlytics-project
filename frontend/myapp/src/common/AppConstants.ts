const Routes = {
  Index: '/',
  Private: {
    Dashboard: '/dashboard',
    Profile: '/profile',
    Products: '/products',
    Categories: '/categories',
    Cart: '/cart',
    Checkout: '/checkout',
    Orders: '/orders',
    Admin: {
      Categories: '/admin/categories',
      Products: '/admin/products',
      Suppliers: '/admin/suppliers',
      Stock: '/admin/stock',
      Purchases: '/admin/purchases',
      Sales: '/admin/sales',
      Customers: '/admin/customers',
      Users: '/admin/users',
    },
  },
  Public: {
    Login: '/login',
    Register: '/register',
    ForgotPassword: '/forgot-password',
  },
};
/** Relative API paths — base URL comes from VITE_API_BASE_URL */
const ApiUrls = {
  Root: '/',
  // Auth
  Login: '/auth/login',
  Register: '/auth/register',
  RefreshToken: '/auth/refresh-token',
  ChangePassword: '/auth/change-password',
  // Users
  Users: '/users',
  // Catalog
  Products: '/products',
  Categories: '/categories',
  // Customers & suppliers
  Customers: '/customers',
  Suppliers: '/suppliers',
  // Inventory
  Stocks: '/stocks',
  Purchases: '/purchases',
  PurchaseItems: '/purchase-items',
  Sales: '/sales',
  SaleItems: '/sale-items',
  // Commerce (JWT)
  Cart: '/cart',
  CartItems: '/cart/items',
  CartItemById: '/cart-items',
  Orders: '/orders',
  Checkout: '/orders/checkout',
  OrderItems: '/order-items',
  Payments: '/payments',
} as const;
/** Path builders for resources with :id — use in services, not in components */
const ApiUrlBuilders = {
  user: (id: number | string) => `${ApiUrls.Users}/${id}`,
  userStatus: (id: number | string) => `${ApiUrls.Users}/${id}/status`,
  product: (id: number | string) => `${ApiUrls.Products}/${id}`,
  category: (id: number | string) => `${ApiUrls.Categories}/${id}`,
  customer: (id: number | string) => `${ApiUrls.Customers}/${id}`,
  supplier: (id: number | string) => `${ApiUrls.Suppliers}/${id}`,
  stock: (id: number | string) => `${ApiUrls.Stocks}/${id}`,
  purchase: (id: number | string) => `${ApiUrls.Purchases}/${id}`,
  purchaseItem: (id: number | string) => `${ApiUrls.PurchaseItems}/${id}`,
  sale: (id: number | string) => `${ApiUrls.Sales}/${id}`,
  saleItem: (id: number | string) => `${ApiUrls.SaleItems}/${id}`,
  cartItem: (id: number | string) => `${ApiUrls.CartItemById}/${id}`,
  order: (id: number | string) => `${ApiUrls.Orders}/${id}`,
  orderStatus: (id: number | string) => `${ApiUrls.Orders}/${id}/status`,
  orderItem: (id: number | string) => `${ApiUrls.OrderItems}/${id}`,
  payment: (id: number | string) => `${ApiUrls.Payments}/${id}`,
  paymentStatus: (id: number | string) => `${ApiUrls.Payments}/${id}/status`,
};
/** Frontend route builders — use in Link/navigate, not for API */
const RouteBuilders = {
  product: (id: number | string) => `${Routes.Private.Products}/${id}`,
  order: (id: number | string) => `${Routes.Private.Orders}/${id}`,
};
const Validations = {
  Email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PasswordLength: 6,
};
const Strings = {
  Errors: {
    InvalidField: (field: string) => `${field} is invalid`,
    MinLength: (field: string, min: number) => `${field} must be at least ${min} characters`,
    InvalidCredentials: 'Invalid email or password',
    Global: 'Something went wrong, please try again later',
    FieldRequired: 'This field is required',
  },
};

export const AppConstants = {
  Routes,
  RouteBuilders,
  ApiUrls,
  ApiUrlBuilders,
  Validations,
  Strings,
};
