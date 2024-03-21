import React from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Button, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

import { BestPracticeID } from './bestPractice.types';
import { useCheckFormBestPractice } from 'hooks/useCheckFormBestPractice';

import { BEST_PRACTICE_DEFINITIONS } from './bestPractice.constants';

type BestPracticeAlertProps = {
  id: BestPracticeID;
};

export const BestPracticeAlert = ({ id }: BestPracticeAlertProps) => {
  const { disableBestPractice, ignoreBestPractice, warnings } = useCheckFormBestPractice();
  const bestPracticeDefinition = BEST_PRACTICE_DEFINITIONS.find((definition) => definition.id === id);
  const styles = useStyles2(getStyles);

  if (!bestPracticeDefinition || !warnings.includes(id)) {
    return null;
  }

  const { title, description } = bestPracticeDefinition;

  return (
    <Alert severity="warning" title={`Best Practice: ${title}`}>
      <div className={styles.stackCol}>
        <div>{description}</div>
        <div className={styles.stack}>
          <Button variant="secondary" onClick={() => ignoreBestPractice({ id, enabled: false })}>
            Ignore
          </Button>
          <Button variant="secondary" onClick={() => disableBestPractice({ id, enabled: false })}>
            Disable this best practice
          </Button>
        </div>
      </div>
    </Alert>
  );
};

const getStyles = (theme: GrafanaTheme2) => ({
  stackCol: css({
    display: `flex`,
    gap: theme.spacing(1),
    flexDirection: `column`,
  }),
  stack: css({
    display: `flex`,
    gap: theme.spacing(1),
  }),
});
