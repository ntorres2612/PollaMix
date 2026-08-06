import { Test, TestingModule } from '@nestjs/testing';
import { FootballApiService } from './football-api.service';

describe('FootballApiService', () => {
  let service: FootballApiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FootballApiService],
    }).compile();

    service = module.get<FootballApiService>(FootballApiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
