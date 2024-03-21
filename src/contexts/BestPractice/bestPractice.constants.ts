import { FieldPath } from 'react-hook-form';

import { BestPracticeDefinition, BestPracticeID } from './bestPractice.types';
import { AlertSensitivity, Check, CheckFormValues } from 'types';

const BEST_PRATICE_SET_ALERTING_RULES: BestPracticeDefinition = {
  id: BestPracticeID.SET_ALERTING_RULES,
  title: 'Set an alerting sensitivity',
  description: 'Set an alerting sensitivity to ensure you are alerted when your checks fail.',
  validate: (check: Check) => {
    if (check.alertSensitivity !== AlertSensitivity.None) {
      return true;
    }

    return false;
  },
};

const BEST_PRATICE_MORE_THAN_ONE_PROBE: BestPracticeDefinition = {
  id: BestPracticeID.MORE_THAN_ONE_PROBE,
  title: 'Set more than one probe',
  description:
    'Checks should have more than one probe. This is to ensure reliability and accurate reachability scores.',
  validate: (check: Check) => {
    if (check.probes.length > 1) {
      return true;
    }

    return false;
  },
};

export const BEST_PRACTICE_DEFINITIONS = [BEST_PRATICE_SET_ALERTING_RULES, BEST_PRATICE_MORE_THAN_ONE_PROBE];

export const WARNING_TO_FIELD_MAP: Record<BestPracticeID, Array<FieldPath<CheckFormValues>>> = {
  [BestPracticeID.SET_ALERTING_RULES]: [`alertSensitivity`],
  [BestPracticeID.MORE_THAN_ONE_PROBE]: [`probes`],
};
