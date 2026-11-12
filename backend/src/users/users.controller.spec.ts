import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';

describe('UsersController - creación del controlador', () => {
  it('instancia el controlador con dependencias simuladas', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
    })
      .useMocker(() => ({}))
      .compile();

    expect(moduleRef.get(UsersController)).toBeDefined();
    await moduleRef.close();
  });
});
