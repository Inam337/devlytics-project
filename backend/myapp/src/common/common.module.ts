import { Global, Module } from '@nestjs/common';
import { CryptoService } from './services/crypto.service';

/** Cross-cutting helpers that every module may inject. */
@Global()
@Module({
  providers: [CryptoService],
  exports: [CryptoService],
})
export class CommonModule {}
