import { BrowserCheck, CheckFormValuesBrowser, CheckType } from 'types';
import { getBaseFormValuesFromCheck } from 'components/CheckEditor/transformations/toFormValues.utils';

export function getBrowserCheckFormValues(check: BrowserCheck): CheckFormValuesBrowser {
  const base = getBaseFormValuesFromCheck(check);

  return {
    ...base,
    checkType: CheckType.Browser,
    settings: {
      browser: {
        script: atob(check.settings?.browser?.script),
      },
    },
  };
}
