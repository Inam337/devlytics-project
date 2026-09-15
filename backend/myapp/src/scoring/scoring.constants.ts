import { ScoreCategory } from '@prisma/client';

/**
 * Default weight configuration (docs/devlytics.md §5.1). Weights must total
 * exactly 100 — `ScoringService` refuses to save a version that does not.
 */
export const DEFAULT_SCORING_WEIGHTS: Record<ScoreCategory, number> = {
  CODE_QUALITY: 25,
  DELIVERY: 20,
  CODE_REVIEW: 15,
  TESTING: 15,
  RELIABILITY: 10,
  COLLABORATION: 5,
  DOCUMENTATION: 5,
  PROJECT_IMPACT: 5,
};

export const SCORE_CATEGORIES = Object.keys(DEFAULT_SCORING_WEIGHTS) as ScoreCategory[];

export const REQUIRED_WEIGHT_TOTAL = 100;

/** Tolerance for the 100% check, so 33.33 + 33.33 + 33.34 is accepted. */
export const WEIGHT_TOTAL_EPSILON = 0.01;

/**
 * Maps a scoring category to the column that stores it on tbl_developer_score
 * and tbl_team_score, so score persistence has one mapping instead of eight
 * hand-written assignments per call site.
 */
export const SCORE_COLUMN: Record<ScoreCategory, string> = {
  CODE_QUALITY: 'codeQualityScore',
  DELIVERY: 'deliveryScore',
  CODE_REVIEW: 'codeReviewScore',
  TESTING: 'testingScore',
  RELIABILITY: 'reliabilityScore',
  COLLABORATION: 'collaborationScore',
  DOCUMENTATION: 'documentationScore',
  PROJECT_IMPACT: 'projectImpactScore',
};

/**
 * Saturation points for normalising raw activity into a 0..100 category score.
 * A developer at or above the reference value scores 100 in that dimension.
 *
 * Lines of code is deliberately absent: LOC is an activity metric only and
 * carries zero scoring weight (docs/devlytics.md §1.1).
 */
export const SCORE_REFERENCE = {
  /** Merged pull requests per period that represent full delivery throughput. */
  MERGED_PRS: 12,
  /** Reviews given per period that represent full review participation. */
  REVIEWS_GIVEN: 20,
  /** Test files added or changed per period for a full testing score. */
  TEST_CHANGES: 15,
  /** Documentation changes per period for a full documentation score. */
  DOC_CHANGES: 8,
  /** Issues resolved per period for a full project-impact score. */
  ISSUES_RESOLVED: 10,
  /** Distinct collaborators (co-reviewed PRs) for a full collaboration score. */
  COLLABORATION_EVENTS: 25,
  /** Commits per period beyond which delivery consistency is fully credited. */
  COMMITS: 40,
} as const;
