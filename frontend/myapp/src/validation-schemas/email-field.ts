import { z } from 'zod';

import type { TranslationFunction } from './types';

type EmailFieldMessages = {
  requiredKey: string;
  requiredDefault: string;
  invalidKey: string;
  invalidDefault: string;
};

/** Zod 4–compatible email: required string + pipe to z.email() */
export const createEmailField = (t: TranslationFunction, messages: EmailFieldMessages) =>
  z
    .string()
    .min(1, t(messages.requiredKey, messages.requiredDefault))
    .pipe(
      z.email({
        message: t(messages.invalidKey, messages.invalidDefault),
      }),
    );
