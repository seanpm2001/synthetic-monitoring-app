import { BestPracticeRule } from './bestPractice.types';

import { BEST_PRACTICE_DEFINITIONS } from './bestPractice.constants';

export function bestPracticeRuleToDefinition(rule: BestPracticeRule) {
  return BEST_PRACTICE_DEFINITIONS.find((definition) => definition.id === rule.id);
}
