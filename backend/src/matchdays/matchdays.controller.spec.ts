import { Test, TestingModule } from '@nestjs/testing';
import { MatchdaysController } from './matchdays.controller';
import { MatchdaysService } from './matchdays.service';

describe('MatchdaysController', () => {
  let controller: MatchdaysController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MatchdaysController],
      providers: [MatchdaysService],
    }).compile();

    controller = module.get<MatchdaysController>(MatchdaysController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
