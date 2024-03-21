import React, { ChangeEvent } from 'react';

import { BestPracticeDefinition } from './bestPractice.types';
import { useGlobalBestPractice } from 'hooks/useGlobalBestPractice';
import { HorizontalCheckboxField } from 'components/HorizonalCheckboxField';

import { bestPracticeRuleToDefinition } from './bestPractice.utils';

export const ConfigureBestPractices = () => {
  const { bestPracticeRules, updateBestPractice } = useGlobalBestPractice();

  return (
    <div>
      <h2>Congifure Best Practices</h2>
      <p>
        There are many ways to set up Synthetic Monitoring checks, we have a few best practcies which we recommend.{' '}
      </p>
      <p>
        Enabling these here we will inform you when creating or editing any checks if there are any improvements you
        could be making.
      </p>
      <div>
        {bestPracticeRules.map((bestPractice) => {
          const { description } = bestPracticeRuleToDefinition(bestPractice) as BestPracticeDefinition;
          return (
            <div key={bestPractice.id}>
              <HorizontalCheckboxField
                id={bestPractice.id}
                name={bestPractice.id}
                label={description}
                checked={bestPractice.enabled}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  updateBestPractice({
                    ...bestPractice,
                    enabled: e.target.checked,
                  });
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
