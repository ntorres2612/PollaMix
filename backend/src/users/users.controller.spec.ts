import { Controller, Get } from '@nestjs/common';

@Controller('users')
export class UsersController {
  @Get()
  findAll() {
    return [
      {
        id: 1,
        name: 'Administrador',
      },
    ];
  }
}

describe('UsersController - creación del controlador', () => {
  it('instancia el controlador con dependencias simuladas', async () => {
    const { Test } = require('@nestjs/testing');
    const { UsersController } = require('./users.controller');

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
    })
      .useMocker(() => ({}))
      .compile();

    expect(moduleRef.get(UsersController)).toBeDefined();
    await moduleRef.close();
  });
});
