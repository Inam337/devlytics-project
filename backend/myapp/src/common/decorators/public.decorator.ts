import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'devlytics:isPublic';

/** Marks a route as reachable without a bearer token (auth, webhooks, health). */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
