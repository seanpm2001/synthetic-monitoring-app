import { Check } from 'types';

export enum BestPracticeID {
  SET_ALERTING_RULES = `SET_ALERTING_RULES`,
  MORE_THAN_ONE_PROBE = `MORE_THAN_ONE_PROBE`,
}

export type BestPracticeDefinition = {
  id: BestPracticeID;
  validate: (check: Check) => boolean;
  title: string;
  description?: string;
};

export type BestPracticeRule = {
  id: BestPracticeID;
  enabled: boolean;
  meta?: Record<string, any>;
};
