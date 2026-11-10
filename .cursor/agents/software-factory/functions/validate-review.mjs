import { FactoryError } from './lib/errors.mjs';
import { rejectProposal } from './lib/product.mjs';

const DECISIONS = ['approve', 'revise'];
const isText = (value) => typeof value === 'string' && value.trim() !== '';

/** Checks the human's review decision and advances the bounded revision counter. */
export async function handler(event, context) {
  const { store, config } = context.factory;
  const { run, response } = event;

  const problems = [];
  if (response === null || typeof response !== 'object' || Array.isArray(response)) {
    problems.push('Task output must be a JSON object');
  } else {
    if (!DECISIONS.includes(response.decision)) problems.push('decision must be "approve" or "revise"');
    if (!isText(response.reviewer)) problems.push('reviewer must name the human who decided');
    if (response.prdVersion !== run.prd.version) problems.push(`prdVersion must be "${run.prd.version}", the version under review`);
    if (response.decision === 'revise' && !isText(response.feedback)) problems.push('feedback is required when decision is "revise"');
  }
  if (problems.length > 0) await rejectProposal(store, run, 'human-review', config.limits.maxRejections, problems);

  const revise = response.decision === 'revise';
  if (revise && run.review.round >= run.review.maxRounds) {
    throw new FactoryError(
      'Factory.RefineLimitExceeded',
      `Reached ${run.review.maxRounds} revision rounds on "${run.slug}". Start a refine execution to keep revising v${run.prd.version}.`,
    );
  }
  return {
    ...run,
    feedback: null,
    review: {
      ...run.review,
      decision: response.decision,
      reviewer: response.reviewer.trim(),
      feedback: isText(response.feedback) ? response.feedback.trim() : null,
      round: revise ? run.review.round + 1 : run.review.round,
    },
  };
}
