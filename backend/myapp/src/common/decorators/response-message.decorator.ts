import { SetMetadata } from '@nestjs/common';

export const RESPONSE_MESSAGE_KEY = 'devlytics:responseMessage';

/** Overrides the default success message in the response envelope. */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);
