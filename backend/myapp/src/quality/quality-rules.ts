import {
  EffortLevel,
  ImpactLevel,
  IssueSeverity,
  QualityCategory,
} from '@prisma/client';

/**
 * Deterministic static-analysis rule catalog.
 *
 * This environment has no repository checkout to run a source-level scanner
 * against (no SonarQube/ESLint pass over cloned code), so evidence is derived
 * from the engineering activity Devlytics has actually collected — commit file
 * stats, CI outcomes, and pull-request size. Each rule below states exactly
 * what it measures and what it does not, so the boundary between measured
 * evidence and inference is never blurred. `duplication_percent` is left at 0
 * with that limitation recorded on the snapshot, rather than invented.
 *
 * Swap this module for a real static analyzer later — every consumer reads
 * `RepositoryEvidence` and `QualityFinding`, not this file's internals.
 */

export interface RepositoryEvidence {
  windowDays: number;
  commits: number;
  filesChanged: number;
  testFileChanges: number;
  docFileChanges: number;
  totalPullRequests: number;
  largePullRequests: number;
  totalBuilds: number;
  failedBuilds: number;
  avgFilesPerCommit: number;
}

export interface QualityFinding {
  ruleId: string;
  category: QualityCategory;
  severity: IssueSeverity;
  title: string;
  observedFact: string;
  effort: EffortLevel;
  impact: ImpactLevel;
  metricKey: string;
  measuredValue: number;
}

const LARGE_PR_LINE_THRESHOLD = 400;
const HIGH_COMPLEXITY_FILES_PER_COMMIT = 12;

type Rule = (evidence: RepositoryEvidence) => QualityFinding | null;

const testCoverageProxy: Rule = (evidence) => {
  if (evidence.filesChanged === 0) return null;
  const ratio = round((evidence.testFileChanges / evidence.filesChanged) * 100);
  if (ratio >= 60) return null;
  return {
    ruleId: 'RULE_LOW_TEST_COVERAGE_PROXY',
    category: 'TESTING',
    severity: ratio < 20 ? 'CRITICAL' : ratio < 40 ? 'MAJOR' : 'MINOR',
    title: 'Low share of test-file changes',
    observedFact: `${ratio}% of file changes in the last ${evidence.windowDays} days touched a test file (target 60%).`,
    effort: 'MEDIUM',
    impact: 'HIGH',
    metricKey: 'test_change_ratio',
    measuredValue: ratio,
  };
};

const ciReliability: Rule = (evidence) => {
  if (evidence.totalBuilds === 0) return null;
  const failureRate = round(
    (evidence.failedBuilds / evidence.totalBuilds) * 100,
  );
  if (failureRate <= 10) return null;
  return {
    ruleId: 'RULE_CI_FAILURE_RATE',
    category: 'RELIABILITY',
    severity:
      failureRate > 40 ? 'CRITICAL' : failureRate > 20 ? 'MAJOR' : 'MINOR',
    title: 'Elevated CI failure rate',
    observedFact: `${failureRate}% of ${evidence.totalBuilds} CI runs failed in the last ${evidence.windowDays} days (${evidence.failedBuilds} failures).`,
    effort: 'MEDIUM',
    impact: 'HIGH',
    metricKey: 'ci_failure_rate',
    measuredValue: failureRate,
  };
};

const largePullRequests: Rule = (evidence) => {
  if (evidence.totalPullRequests === 0) return null;
  const ratio = round(
    (evidence.largePullRequests / evidence.totalPullRequests) * 100,
  );
  if (ratio < 25) return null;
  return {
    ruleId: 'RULE_LARGE_PULL_REQUESTS',
    category: 'MAINTAINABILITY',
    severity: ratio > 60 ? 'MAJOR' : 'MINOR',
    title: 'Large pull requests are common',
    observedFact: `${ratio}% of ${evidence.totalPullRequests} pull requests changed more than ${LARGE_PR_LINE_THRESHOLD} lines, which is harder to review safely.`,
    effort: 'MEDIUM',
    impact: 'MEDIUM',
    metricKey: 'large_pr_ratio',
    measuredValue: ratio,
  };
};

const documentationCoverage: Rule = (evidence) => {
  if (evidence.commits === 0) return null;
  const ratio = round((evidence.docFileChanges / evidence.commits) * 100);
  if (ratio >= 15) return null;
  return {
    ruleId: 'RULE_LOW_DOCUMENTATION_RATIO',
    category: 'DOCUMENTATION',
    severity: ratio < 5 ? 'MAJOR' : 'MINOR',
    title: 'Low documentation activity',
    observedFact: `${ratio}% of ${evidence.commits} commits in the last ${evidence.windowDays} days included a documentation change.`,
    effort: 'LOW',
    impact: 'LOW',
    metricKey: 'doc_change_ratio',
    measuredValue: ratio,
  };
};

const commitComplexityProxy: Rule = (evidence) => {
  if (evidence.avgFilesPerCommit <= HIGH_COMPLEXITY_FILES_PER_COMMIT)
    return null;
  return {
    ruleId: 'RULE_HIGH_COMMIT_FILE_SPAN',
    category: 'COMPLEXITY',
    severity:
      evidence.avgFilesPerCommit > HIGH_COMPLEXITY_FILES_PER_COMMIT * 2
        ? 'MAJOR'
        : 'MINOR',
    title: 'Commits touch a wide file span',
    observedFact: `Commits changed ${evidence.avgFilesPerCommit} files on average over the last ${evidence.windowDays} days, above the ${HIGH_COMPLEXITY_FILES_PER_COMMIT}-file reference.`,
    effort: 'MEDIUM',
    impact: 'MEDIUM',
    metricKey: 'avg_files_per_commit',
    measuredValue: evidence.avgFilesPerCommit,
  };
};

export const QUALITY_RULES: Rule[] = [
  testCoverageProxy,
  ciReliability,
  largePullRequests,
  documentationCoverage,
  commitComplexityProxy,
];

export function evaluateRules(evidence: RepositoryEvidence): QualityFinding[] {
  return QUALITY_RULES.map((rule) => rule(evidence)).filter(
    (f): f is QualityFinding => f !== null,
  );
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
