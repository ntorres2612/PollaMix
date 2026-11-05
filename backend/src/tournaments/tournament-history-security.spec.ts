import { TournamentsService } from './tournaments.service';
import { TournamentsController } from './tournaments.controller';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('Seguridad del historial de Pollas', () => {
  function createServiceMock() {
    const findMany = jest.fn();

    const service = {
      prisma: {
        tournamentParticipant: {
          findMany,
        },
      },
    } as unknown as TournamentsService;

    return { service, findMany };
  }

  it('consulta solamente participaciones del usuario autenticado', async () => {
    const { service, findMany } = createServiceMock();

    findMany.mockResolvedValue([
      {
        tournament: {
          id: 4,
          name: 'Polla finalizada',
        },
      },
    ]);

    const result =
      await TournamentsService.prototype.getMyTournamentHistory.call(
        service,
        7,
      );

    expect(findMany).toHaveBeenCalledTimes(1);

    const query = findMany.mock.calls[0][0];

    expect(query.where).toEqual({
      userId: 7,
    });

    expect(query.where.tournament).toBeUndefined();

    expect(query.select.tournament.select.id).toBe(true);
    expect(query.select.tournament.select.name).toBe(true);

    expect(result).toEqual([
      {
        id: 4,
        name: 'Polla finalizada',
      },
    ]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'no consulta PostgreSQL con identificador inválido %s',
    async (userId) => {
      const { service, findMany } = createServiceMock();

      const result =
        await TournamentsService.prototype.getMyTournamentHistory.call(
          service,
          userId,
        );

      expect(result).toEqual([]);
      expect(findMany).not.toHaveBeenCalled();
    },
  );

  it('mantiene protección JWT en el endpoint my-history', () => {
    const handler =
      TournamentsController.prototype.getMyHistory;

    const guards = Reflect.getMetadata(
      '__guards__',
      handler,
    ) as unknown[];

    expect(guards).toContain(JwtAuthGuard);

    expect(
      Reflect.getMetadata('path', handler),
    ).toBe('my-history');

    expect(
      Reflect.getMetadata('method', handler),
    ).toBe(0);
  });

  it('toma el identificador del usuario autenticado', () => {
    const getMyTournamentHistory = jest.fn();

    const controller = {
      tournamentsService: {
        getMyTournamentHistory,
      },
    } as unknown as TournamentsController;

    TournamentsController.prototype.getMyHistory.call(
      controller,
      {
        user: {
          id: 7,
        },
      },
    );

    expect(getMyTournamentHistory).toHaveBeenCalledWith(7);
  });
});
