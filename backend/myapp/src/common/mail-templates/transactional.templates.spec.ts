import {
  addedToTeamMail,
  assignedToProjectMail,
  developerInvitationMail,
  organizationCreatedMail,
  passwordResetMail,
} from './transactional.templates';

describe('transactional mail templates (WOR-14)', () => {
  it('organizationCreatedMail includes subject, preheader, body, list, CTA and footer', () => {
    const input = organizationCreatedMail({
      recipientFirstName: 'Ada',
      organizationName: 'Acme Corp',
      organizationSlug: 'acme-corp',
      ctaUrl: 'https://app.devlytics.local/onboarding',
    });

    expect(input.subject).toContain('Acme Corp');
    expect(input.preheader).toBeTruthy();
    expect(input.bodyParagraphs.join(' ')).toContain('Ada');
    expect(input.bodyParagraphs.join(' ')).toContain('Acme Corp');
    expect(input.list?.length).toBeGreaterThan(0);
    expect(input.cta).toEqual({
      label: 'Go to onboarding',
      url: 'https://app.devlytics.local/onboarding',
    });
    expect(input.footer).toBeTruthy();
  });

  it('developerInvitationMail surfaces organization and role', () => {
    const input = developerInvitationMail({
      recipientFirstName: 'Grace',
      organizationName: 'Acme Corp',
      roleName: 'Developer',
      ctaUrl:
        'https://app.devlytics.local/accept-invitation?email=grace%40example.com',
    });

    expect(input.subject).toContain('Acme Corp');
    expect(input.list).toEqual(
      expect.arrayContaining([
        { label: 'Organization', detail: 'Acme Corp' },
        { label: 'Role', detail: 'Developer' },
      ]),
    );
    expect(input.cta?.url).toContain('accept-invitation');
  });

  it('passwordResetMail surfaces the configured expiry and never hardcodes 30', () => {
    const input = passwordResetMail({
      recipientFirstName: 'Linus',
      expiresInMinutes: 45,
      ctaUrl: 'https://app.devlytics.local/reset-password?token=abc123',
    });

    expect(input.preheader).toContain('45 minutes');
    expect(input.bodyParagraphs.join(' ')).toContain('45 minutes');
    expect(input.bodyParagraphs.join(' ')).not.toContain('30 minutes');
    expect(input.cta).toEqual({
      label: 'Reset your password',
      url: 'https://app.devlytics.local/reset-password?token=abc123',
    });
  });

  it('addedToTeamMail includes team details and an optional position', () => {
    const input = addedToTeamMail({
      recipientFirstName: 'Rosalind',
      teamName: 'Platform',
      teamCode: 'PLT',
      positionTitle: 'Backend Engineer',
      ctaUrl: 'https://app.devlytics.local/teams/team-1',
    });

    expect(input.subject).toContain('Platform');
    expect(input.list).toEqual(
      expect.arrayContaining([
        { label: 'Team', detail: 'Platform (PLT)' },
        { label: 'Position', detail: 'Backend Engineer' },
      ]),
    );
  });

  it('addedToTeamMail omits the position row when none is given', () => {
    const input = addedToTeamMail({
      recipientFirstName: 'Rosalind',
      teamName: 'Platform',
      teamCode: 'PLT',
      ctaUrl: 'https://app.devlytics.local/teams/team-1',
    });

    expect(input.list).toEqual([{ label: 'Team', detail: 'Platform (PLT)' }]);
  });

  it('assignedToProjectMail includes an allocation metric row and role in the body', () => {
    const input = assignedToProjectMail({
      recipientFirstName: 'Katherine',
      projectName: 'Orbit',
      roleLabel: 'Tech Lead',
      allocationPercent: 60,
      ctaUrl: 'https://app.devlytics.local/projects/project-1',
    });

    expect(input.subject).toContain('Orbit');
    expect(input.bodyParagraphs.join(' ')).toContain('Tech Lead');
    expect(input.metricRows).toEqual([{ label: 'Allocation', value: '60%' }]);
  });
});
