import { Controller, Get } from '@nestjs/common';
import { Public } from '../../common/decorators/auth.decorator';
import { SaludService } from './salud.service';

@Controller()
export class SaludController {
  constructor(private readonly saludService: SaludService) {}

  @Public()
  @Get('salud')
  salud() {
    return this.saludService.verificar();
  }
}
