import React, { createContext, ReactNode, useContext, useReducer } from 'react';

import { BestPracticeRule } from './bestPractice.types';

import { BEST_PRACTICE_DEFINITIONS } from './bestPractice.constants';

type BestPracticeStateAction =
  | {
      type: 'updateBestPractice';
      payload: BestPracticeRule;
    }
  | {
      type: 'updateEnabled';
      payload: boolean;
    };

type BestPracticeState = {
  bestPracticeRules: BestPracticeRule[];
  enabled: boolean;
};

type BestPracticeContextProps = null | {
  state: [BestPracticeState, React.Dispatch<BestPracticeStateAction>];
};

const BestPracticeGlobalContext = createContext<BestPracticeContextProps>(null);

export function useBestPracticeGlobalContext() {
  const context = useContext(BestPracticeGlobalContext);

  if (!context) {
    throw new Error('useBestPracticeGlobalContext must be used within a BestPracticeGlobalContext.Provider');
  }

  return context;
}

const bestPracticeRules: BestPracticeRule[] = BEST_PRACTICE_DEFINITIONS.map((definition) => ({
  id: definition.id,
  enabled: true,
}));

export const BestPracticeGlobalContextProvider = ({ children }: { children: ReactNode }) => {
  const localStorageValues = parseLocalStorage();
  const initialState: BestPracticeState = localStorageValues;
  const state = useReducer(reducer, initialState);

  return <BestPracticeGlobalContext.Provider value={{ state }}>{children}</BestPracticeGlobalContext.Provider>;
};

function reducer(state: BestPracticeState, action: BestPracticeStateAction) {
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

  return state;
}

function parseLocalStorage(): BestPracticeState {
  const localStorageBestPracticeState = localStorage.getItem('bestPracticeRules');
  const initialState = {
    bestPracticeRules,
    enabled: true,
  };

  if (!localStorageBestPracticeState) {
    return initialState;
  }

  try {
    return JSON.parse(localStorageBestPracticeState);
  } catch (e) {
    console.error('Error parsing best practice rules from local storage', e);
    return initialState;
  }
}
