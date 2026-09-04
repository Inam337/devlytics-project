// types/axios.d.ts
import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    skipAuth?: boolean;
    /** Internal: prevent refresh interceptor loop */
    skipRefreshRetry?: boolean;
    _retry?: boolean;
  }
}
