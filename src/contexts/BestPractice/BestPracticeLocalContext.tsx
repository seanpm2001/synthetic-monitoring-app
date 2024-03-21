import React, { createContext, ReactNode, useContext, useReducer } from 'react';

import { BestPracticeID as BestPracticeID, BestPracticeRule } from './bestPractice.types';
import { useGlobalBestPractice } from 'hooks/useGlobalBestPractice';

type BestPracticeStateAction =
  | {
      type: 'updateBestPractice';
      payload: BestPracticeRule;
    }
  | {
      type: 'updateEnabled';
      payload: boolean;
    }
  | {
      type: 'updateWarnings';
      payload: BestPracticeID[];
    }
  | {
      type: 'updateWatch';
      payload: boolean;
    };

type BestPracticeState = {
  bestPracticeRules: BestPracticeRule[];
  enabled: boolean;
  warnings: BestPracticeID[];
  watch: boolean;
};

type LocalBestPracticeState = BestPracticeState & { warnings: any[] };

type BestPracticeLocalContextProps = null | {
  state: [LocalBestPracticeState, React.Dispatch<BestPracticeStateAction>];
};

const BestPracticeLocalContext = createContext<BestPracticeLocalContextProps>(null);

export function useBestPracticeLocalContext() {
  const context = useContext(BestPracticeLocalContext);

  if (!context) {
    throw new Error('useBestPracticeLocalContext must be used within a BestPracticeLocalContext.Provider');
  }

  return context;
}

export const BestPracticeLocalContextProvider = ({ children }: { children: ReactNode }) => {
  const { bestPracticeRules, enabled } = useGlobalBestPractice();
  const initialState = { enabled, bestPracticeRules, warnings: [], watch: false };
  const state = useReducer(reducer, initialState);

  return <BestPracticeLocalContext.Provider value={{ state }}>{children}</BestPracticeLocalContext.Provider>;
};

function reducer(state: LocalBestPracticeState, action: BestPracticeStateAction) {
  if (action.type === 'updateBestPractice') {
    const updatedBestPracticeRules = state.bestPracticeRules.map((bestPracticeRule) => {
      if (bestPracticeRule.id === action.payload.id) {
        return action.payload;
      }

      return bestPracticeRule;
    });

    return {
      ...state,
      bestPracticeRules: updatedBestPracticeRules,
    };
  }

  if (action.type === 'updateEnabled') {
    return {
      ...state,
      enabled: action.payload,
    };
  }

  if (action.type === 'updateWarnings') {
    return {
      ...state,
      warnings: action.payload,
    };
  }

  if (action.type === 'updateWatch') {
    return {
      ...state,
      watch: action.payload,
    };
  }

  return state;
}
