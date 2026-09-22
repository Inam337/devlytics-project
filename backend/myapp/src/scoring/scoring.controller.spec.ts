import { ScoringController } from './scoring.controller';
import type { ScoringService } from './scoring.service';
import type { SetScoringWeightsDto } from './dto/scoring.dto';

describe('ScoringController', () => {
  let service: { findWeights: jest.Mock; setWeights: jest.Mock };
  let controller: ScoringController;

  beforeEach(() => {
    service = { findWeights: jest.fn(), setWeights: jest.fn() };
    controller = new ScoringController(service as unknown as ScoringService);
  });

  it('findWeights delegates to the service with the organization from the token', () => {
    service.findWeights.mockReturnValue('weights');
    expect(controller.findWeights('org-1')).toBe('weights');
    expect(service.findWeights).toHaveBeenCalledWith('org-1');
  });

  it('createWeights forwards the dto and builds an actor context from the current user and client info', () => {
    service.setWeights.mockReturnValue('created');
    const dto = { categories: [] } as unknown as SetScoringWeightsDto;

    const result = controller.createWeights('org-1', dto, 'user-1', {
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(result).toBe('created');
    expect(service.setWeights).toHaveBeenCalledWith('org-1', dto, {
      actorId: 'user-1',
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });
  });

  it('setWeights (PATCH) delegates identically to createWeights (POST)', () => {
    service.setWeights.mockReturnValue('updated');
    const dto = { categories: [] } as unknown as SetScoringWeightsDto;

    const result = controller.setWeights('org-1', dto, 'user-1', {
      ipAddress: '10.0.0.1',
      userAgent: 'jest',
    });

    expect(result).toBe('updated');
    expect(service.setWeights).toHaveBeenCalledWith('org-1', dto, {
      actorId: 'user-1',
      ipAddress: '10.0.0.1',
      userAgent: 'jest',
    });
  });
});
