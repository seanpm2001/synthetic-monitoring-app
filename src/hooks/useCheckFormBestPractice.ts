import { useCallback } from 'react';

import { Check } from 'types';
import { BestPracticeDefinition, BestPracticeID, BestPracticeRule } from 'contexts/BestPractice/bestPractice.types';
import { bestPracticeRuleToDefinition } from 'contexts/BestPractice/bestPractice.utils';
import { useBestPracticeLocalContext } from 'contexts/BestPractice/BestPracticeLocalContext';

import { useGlobalBestPractice } from './useGlobalBestPractice';

export function useCheckFormBestPractice() {
  const {
    state: [bestPracticeLocalState, dispatch],
  } = useBestPracticeLocalContext();
  const global = useGlobalBestPractice();
  const { bestPracticeRules, enabled, warnings, watch } = bestPracticeLocalState;

  const disableLocalBestPractices = useCallback(() => {
    dispatch({ type: 'updateEnabled', payload: false });
  }, [dispatch]);

  const disableGlobalBestPractices = useCallback(() => {
    disableLocalBestPractices();
    global.updateEnabled(false);
  }, [disableLocalBestPractices, global]);

  const updateWarnings = useCallback(
    (warnings: BestPracticeID[]) => {
      dispatch({ type: 'updateWarnings', payload: warnings });
    },
    [dispatch]
  );

  const updateWatch = useCallback(
    (watch: boolean) => {
      dispatch({ type: 'updateWatch', payload: watch });
    },
    [dispatch]
  );

  const ignoreBestPractice = useCallback(
    (payload: BestPracticeRule) => {
      dispatch({ type: 'updateBestPractice', payload });
      const newWarnings = warnings.filter((warning) => warning !== payload.id);
      updateWarnings(newWarnings);
    },
    [dispatch, updateWarnings, warnings]
  );

  const disableBestPractice = useCallback(
    (payload: BestPracticeRule) => {
      global.updateBestPractice(payload);
      ignoreBestPractice(payload);
    },
    [global, ignoreBestPractice]
  );

  const getWarnings = useCallback(
    (check: Check) => {
      const definitions = bestPracticeRules
        .filter((rule) => rule.enabled)
        .map(bestPracticeRuleToDefinition) as BestPracticeDefinition[]; // TODO: Fix this type cast

      return definitions
        .map((definition) => (definition.validate(check) ? null : definition.id))
        .filter(Boolean) as BestPracticeID[]; // TODO: Fix this type cast
    },
    [bestPracticeRules]
  );

  const validate = useCallback(
    (check: Check, enableWatch?: boolean) => {
      if (!enabled) {
        return true;
      }

      const shouldUpdate = enableWatch || watch;
      const warnings = getWarnings(check);
      enableWatch && updateWatch(enableWatch);

      if (shouldUpdate) {
        updateWarnings(warnings);
      }

      return warnings.length === 0;
    },
    [enabled, getWarnings, updateWarnings, updateWatch, watch]
  );

  return {
    disableLocalBestPractices,
    disableGlobalBestPractices,
    ignoreBestPractice,
    disableBestPractice,
    warnings,
    validate,
  };
}
