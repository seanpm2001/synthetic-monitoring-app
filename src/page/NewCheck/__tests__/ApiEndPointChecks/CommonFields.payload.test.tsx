import { screen } from '@testing-library/react';
import { PRIVATE_PROBE } from 'test/fixtures/probes';
import { selectOption } from 'test/utils';

import { AlertSensitivity, Check, CheckType } from 'types';
import {
  FALLBACK_CHECK_BROWSER,
  FALLBACK_CHECK_DNS,
  FALLBACK_CHECK_GRPC,
  FALLBACK_CHECK_HTTP,
  FALLBACK_CHECK_PING,
  FALLBACK_CHECK_TCP,
  FALLBACK_CHECK_TRACEROUTE,
} from 'components/constants';

import { fillMandatoryFields } from '../../../__testHelpers__/apiEndPoint';
import { goToSection, renderNewForm, submitForm, TARGET_MAP } from '../../../__testHelpers__/checkForm';

export const FALLBACK_CHECK_MAP: Record<string, Check> = {
  [CheckType.HTTP]: FALLBACK_CHECK_HTTP,
  [CheckType.PING]: FALLBACK_CHECK_PING,
  [CheckType.GRPC]: FALLBACK_CHECK_GRPC,
  [CheckType.DNS]: FALLBACK_CHECK_DNS,
  [CheckType.TCP]: FALLBACK_CHECK_TCP,
  [CheckType.Traceroute]: FALLBACK_CHECK_TRACEROUTE,
  [CheckType.Browser]: FALLBACK_CHECK_BROWSER,
};

describe('Api endpoint checks - common fields payload', () => {
  Object.keys(FALLBACK_CHECK_MAP).forEach((cType) => {
    describe(`${cType}`, () => {
      const checkType = cType as CheckType;

      it(`can submit the form with the minimum required fields`, async () => {
        const { user, read } = await renderNewForm(checkType);
        await fillMandatoryFields({ user, checkType });

        await submitForm(user);

        const { body } = await read();

        expect(body).toEqual({
          ...FALLBACK_CHECK_MAP[checkType],
          job: 'MANDATORY JOB NAME',
          target: TARGET_MAP[checkType],
          probes: [PRIVATE_PROBE.id],
        });
      });

      describe(`Section 3 (labels)`, () => {
        it(`can submit the form with labels filled in`, async () => {
          const LABEL_KEY_1 = 'label1';
          const LABEL_VALUE_1 = 'value1';
          const LABEL_KEY_2 = 'label2';
          const LABEL_VALUE_2 = 'value2';

          const { user, read } = await renderNewForm(checkType);
          await fillMandatoryFields({ user, checkType });
          await goToSection(user, 3);

          const addLabelButton = screen.getByText('Add Label', { exact: false });
          await user.click(addLabelButton);

          await user.type(screen.getByLabelText('label 1 name'), LABEL_KEY_1);
          await user.type(screen.getByLabelText('label 1 value'), LABEL_VALUE_1);

          await user.click(addLabelButton);
          await user.type(screen.getByLabelText('label 2 name'), LABEL_KEY_2);
          await user.type(screen.getByLabelText('label 2 value'), LABEL_VALUE_2);

          await submitForm(user);

          const { body } = await read();

          expect(body.labels).toEqual([
            { name: LABEL_KEY_1, value: LABEL_VALUE_1 },
            { name: LABEL_KEY_2, value: LABEL_VALUE_2 },
          ]);
        });
      });

      describe(`Section 4 (alerting)`, () => {
        it(`can submit the form with alerting filled in`, async () => {
          const { user, read } = await renderNewForm(checkType);
          await fillMandatoryFields({ user, checkType });

          await goToSection(user, 4);
          await selectOption(user, { label: `Select alert sensitivity`, option: `Medium` });

          await submitForm(user);

          const { body } = await read();

          expect(body.alertSensitivity).toBe(AlertSensitivity.Medium);
        });
      });

      describe(`Section 5 (Execution)`, () => {
        it(`can publish a full set of metrics`, async () => {
          const { user, read } = await renderNewForm(checkType);
          await fillMandatoryFields({ user, checkType });
          await goToSection(user, 5);

          await user.click(screen.getByLabelText('Publish full set of metrics', { exact: false }));
          await submitForm(user);

          const { body } = await read();
          expect(body.basicMetricsOnly).toBe(false);
        });
      });
    });
  });
});
