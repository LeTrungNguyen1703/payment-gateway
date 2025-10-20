import { Test, TestingModule } from '@nestjs/testing';
import { PayosService } from './payos.service';

describe('PayosService', () => {
  let service: PayosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayosService],
    }).compile();

    service = module.get<PayosService>(PayosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
