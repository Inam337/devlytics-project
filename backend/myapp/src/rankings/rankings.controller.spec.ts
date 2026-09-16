import { RankingsController } from './rankings.controller';
import type { RankingsService } from './rankings.service';
import { RankingsQueryDto } from './dto/rankings-query.dto';

describe('RankingsController', () => {
  let service: { developerLeaderboard: jest.Mock; teamLeaderboard: jest.Mock; history: jest.Mock };
  let controller: RankingsController;

  beforeEach(() => {
    service = {
      developerLeaderboard: jest.fn(),
      teamLeaderboard: jest.fn(),
      history: jest.fn(),
    };
    controller = new RankingsController(service as unknown as RankingsService);
  });

  it('developers delegates to developerLeaderboard with the organization and query', () => {
    const query = new RankingsQueryDto();
    service.developerLeaderboard.mockReturnValue('dev-leaderboard');

    expect(controller.developers('org-1', query)).toBe('dev-leaderboard');
    expect(service.developerLeaderboard).toHaveBeenCalledWith('org-1', query);
  });

  it('teams delegates to teamLeaderboard with the organization and query', () => {
    const query = new RankingsQueryDto();
    service.teamLeaderboard.mockReturnValue('team-leaderboard');

    expect(controller.teams('org-1', query)).toBe('team-leaderboard');
    expect(service.teamLeaderboard).toHaveBeenCalledWith('org-1', query);
  });

  it('history delegates to the service history read', () => {
    const query = new RankingsQueryDto();
    service.history.mockReturnValue('history');

    expect(controller.history('org-1', query)).toBe('history');
    expect(service.history).toHaveBeenCalledWith('org-1', query);
  });
});
