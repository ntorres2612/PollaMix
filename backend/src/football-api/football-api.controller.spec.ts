import { Test, TestingModule } from '@nestjs/testing';
import { FootballApiController } from './football-api.controller';

describe('FootballApiController', () => {
  let controller: FootballApiController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FootballApiController],
    }).compile();

    controller = module.get<FootballApiController>(FootballApiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
