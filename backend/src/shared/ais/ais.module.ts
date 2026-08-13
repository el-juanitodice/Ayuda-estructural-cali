import { Global, Module } from '@nestjs/common';
import { AisService } from './ais.service';

@Global()
@Module({
  providers: [AisService],
  exports: [AisService],
})
export class AisModule {}
