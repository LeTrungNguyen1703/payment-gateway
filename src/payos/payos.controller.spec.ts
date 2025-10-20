import { Test, TestingModule } from '@nestjs/testing';
import { PayosController } from './payos.controller';

describe('PayosController', () => {
  let controller: PayosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayosController],
    }).compile();

    controller = module.get<PayosController>(PayosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
