const Routes = {
  Index: '/',
  Private: {
    Dashboard: '/dashboard',
    Profile: '/profile',
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
} as const;
/** Path builders for resources with :id — use in services, not in components */
const ApiUrlBuilders = {
  user: (id: number | string) => `${ApiUrls.Users}/${id}`,
  userStatus: (id: number | string) => `${ApiUrls.Users}/${id}/status`,
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
  ApiUrls,
  ApiUrlBuilders,
  Validations,
  Strings,
};
