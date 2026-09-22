import { Global, Module } from '@nestjs/common';
import { CryptoService } from './services/crypto.service';
import { MailService } from './services/mail.service';

/** Cross-cutting helpers that every module may inject. */
@Global()
@Module({
  providers: [CryptoService, MailService],
  exports: [CryptoService, MailService],
})
export class CommonModule {}
