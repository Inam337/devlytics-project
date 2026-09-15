import { evaluateRules, RepositoryEvidence } from './quality-rules';

function evidence(overrides: Partial<RepositoryEvidence> = {}): RepositoryEvidence {
  return {
    windowDays: 30,
    commits: 100,
    filesChanged: 100,
    testFileChanges: 60,
    docFileChanges: 15,
    totalPullRequests: 20,
    largePullRequests: 2,
    totalBuilds: 50,
    failedBuilds: 2,
    avgFilesPerCommit: 5,
    ...overrides,
  };
}

describe('quality-rules', () => {
  it('produces no findings for healthy evidence', () => {
    expect(evaluateRules(evidence())).toEqual([]);
  });

  it('flags low test coverage proxy below the 60% reference', () => {
    const findings = evaluateRules(evidence({ testFileChanges: 10, filesChanged: 100 }));
    const finding = findings.find((f) => f.ruleId === 'RULE_LOW_TEST_COVERAGE_PROXY');
    expect(finding).toBeDefined();
    expect(finding!.category).toBe('TESTING');
    expect(finding!.severity).toBe('CRITICAL');
    expect(finding!.observedFact).toContain('10%');
  });

  it('escalates severity as the CI failure rate worsens', () => {
    const minor = evaluateRules(evidence({ totalBuilds: 100, failedBuilds: 15 }));
    const critical = evaluateRules(evidence({ totalBuilds: 100, failedBuilds: 50 }));

    expect(minor.find((f) => f.ruleId === 'RULE_CI_FAILURE_RATE')?.severity).toBe('MINOR');
    expect(critical.find((f) => f.ruleId === 'RULE_CI_FAILURE_RATE')?.severity).toBe('CRITICAL');
  });

  it('never emits a finding when there is no denominator to measure against', () => {
    const findings = evaluateRules(
      evidence({ filesChanged: 0, totalPullRequests: 0, totalBuilds: 0, commits: 0 }),
    );
    expect(findings).toEqual([]);
  });

  it('flags a high share of large pull requests', () => {
    const findings = evaluateRules(evidence({ totalPullRequests: 10, largePullRequests: 7 }));
    const finding = findings.find((f) => f.ruleId === 'RULE_LARGE_PULL_REQUESTS');
    expect(finding?.severity).toBe('MAJOR');
  });

  it('flags low documentation activity relative to commit count', () => {
    const findings = evaluateRules(evidence({ commits: 100, docFileChanges: 2 }));
    const finding = findings.find((f) => f.ruleId === 'RULE_LOW_DOCUMENTATION_RATIO');
    expect(finding?.category).toBe('DOCUMENTATION');
  });

  it('flags commits that touch an unusually wide file span', () => {
    const findings = evaluateRules(evidence({ avgFilesPerCommit: 30 }));
    const finding = findings.find((f) => f.ruleId === 'RULE_HIGH_COMMIT_FILE_SPAN');
    expect(finding?.category).toBe('COMPLEXITY');
    expect(finding?.severity).toBe('MAJOR');
  });

  it('every finding names the rule that produced it and its raw measured value', () => {
    const findings = evaluateRules(evidence({ testFileChanges: 5, filesChanged: 100 }));
    for (const finding of findings) {
      expect(finding.ruleId).toEqual(expect.stringMatching(/^RULE_/));
      expect(typeof finding.measuredValue).toBe('number');
      expect(finding.observedFact.length).toBeGreaterThan(0);
    }
  });
});
