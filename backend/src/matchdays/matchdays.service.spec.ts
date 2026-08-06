import { Test, TestingModule } from '@nestjs/testing';
import { MatchdaysService } from './matchdays.service';

describe('MatchdaysService', () => {
  let service: MatchdaysService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MatchdaysService],
    }).compile();

    service = module.get<MatchdaysService>(MatchdaysService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
