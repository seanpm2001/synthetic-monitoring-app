import { useCallback } from 'react';

import { BestPracticeRule } from 'contexts/BestPractice/bestPractice.types';
import { useBestPracticeGlobalContext } from 'contexts/BestPractice/BestPracticeGlobalContext';

export function useGlobalBestPractice() {
  const {
    state: [bestPracticeGlobalState, dispatch],
  } = useBestPracticeGlobalContext();

  const { bestPracticeRules, enabled } = bestPracticeGlobalState;

  const updateBestPractice = useCallback(
    (bestPractice: BestPracticeRule) => {
      dispatch({ type: 'updateBestPractice', payload: bestPractice });
    },
    [dispatch]
  );

  const updateEnabled = useCallback(
    (enabled: boolean) => {
      dispatch({ type: 'updateEnabled', payload: enabled });
    },
    [dispatch]
  );

  return {
    bestPracticeRules,
    enabled,
    updateBestPractice,
    updateEnabled,
  };
}
