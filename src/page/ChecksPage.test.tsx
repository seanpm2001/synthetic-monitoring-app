import React from 'react';
import { screen, waitFor, within } from '@testing-library/react';
import { DataTestIds } from 'test/dataTestIds';
import { ALERTING_RULES } from 'test/fixtures/alerting';
import { BASIC_CHECK_LIST, BASIC_HTTP_CHECK, BASIC_PING_CHECK } from 'test/fixtures/checks';
import { apiRoute } from 'test/handlers';
import { render } from 'test/render';
import { server } from 'test/server';

import { AlertSensitivity, Check, CheckTypeGroup, ROUTES } from 'types';
import { PLUGIN_URL_PATH } from 'components/Routing.consts';

import { CheckRouter } from './CheckRouter';

const renderChecksPage = async () => {
  const res = render(<CheckRouter />, {
    path: `${PLUGIN_URL_PATH}${ROUTES.Checks}`,
    route: `${PLUGIN_URL_PATH}${ROUTES.Checks}`,
  });

  await waitFor(() => expect(screen.getByText('Add new check')).toBeInTheDocument());
  return res;
};

test('renders checks', async () => {
  await renderChecksPage();
  expect(screen.getByText(BASIC_PING_CHECK.job)).toBeInTheDocument();
});

test('renders check selection page with correct check types', async () => {
  const { user } = await renderChecksPage();
  await user.click(screen.getByText('Add new check'));
  await waitFor(() => expect(screen.getByTestId(DataTestIds.CHOOSE_CHECK_TYPE)).toBeInTheDocument());
  const apiEndPointCard = screen.getByTestId(`${DataTestIds.CHECK_GROUP_CARD}-${CheckTypeGroup.ApiTest}`);

  expect(within(apiEndPointCard).getByText('HTTP')).toBeInTheDocument();
  expect(within(apiEndPointCard).getByText('Ping')).toBeInTheDocument();
  expect(within(apiEndPointCard).getByText('DNS')).toBeInTheDocument();
  expect(within(apiEndPointCard).getByText('TCP')).toBeInTheDocument();
  expect(within(apiEndPointCard).getByText('Traceroute')).toBeInTheDocument();

  const multiStepCard = screen.getByTestId(`${DataTestIds.CHECK_GROUP_CARD}-${CheckTypeGroup.MultiStep}`);
  expect(within(multiStepCard).getByText('HTTP')).toBeInTheDocument();
});

test('renders check editor existing check', async () => {
  const { user } = await renderChecksPage();
  const editButtons = await screen.findAllByTestId('edit-check-button');
  const sortedBasicCheckList = BASIC_CHECK_LIST.sort((a, b) => a.job.localeCompare(b.job));
  const checkToEdit = 3;

  await user.click(editButtons[checkToEdit]);
  await waitFor(() => expect(screen.getByText(`Editing ${sortedBasicCheckList[checkToEdit].job}`)).toBeInTheDocument());
});

test(`renders alerts for relevant checks`, async () => {
  const HIGH_SENSITIVITY_CHECK: Check = {
    ...BASIC_HTTP_CHECK,
    alertSensitivity: AlertSensitivity.High,
  };

  server.use(
    apiRoute(`listChecks`, {
      result: () => {
        return {
          json: [HIGH_SENSITIVITY_CHECK],
        };
      },
    })
  );
  const { user } = await renderChecksPage();
  const alertToggle = await screen.findByLabelText('Alert rules');

  await user.click(alertToggle);

  const alertRule = await screen.findByText(`SyntheticMonitoringCheckFailureAtHighSensitivity`);
  expect(alertRule).toBeInTheDocument();
});

test(`renders alert configuration error when it doesn't detect a relevant alert`, async () => {
  const HIGH_SENSITIVITY_CHECK: Check = {
    ...BASIC_HTTP_CHECK,
    alertSensitivity: AlertSensitivity.High,
  };

  server.use(
    apiRoute(`listChecks`, {
      result: () => {
        return {
          json: [HIGH_SENSITIVITY_CHECK],
        };
      },
    })
  );

  server.use(
    apiRoute(`getPromAlertRules`, {
      result: () => {
        return {
          json: {
            status: 'success',
            data: {
              groups: [],
            },
          },
        };
      },
    })
  );

  const { user } = await renderChecksPage();
  const alertToggle = await screen.findByText('Alert configuration');

  await user.click(alertToggle);

  const toggletip = await screen.findByTestId(`toggletip-content`);
  const alertRule = await within(toggletip).findByText(/This check has an alert sensitivity of/);
  const alertSensitivity = await within(toggletip).findByText(`high`);
  expect(alertRule).toBeInTheDocument();
  expect(alertSensitivity).toBeInTheDocument();
});

test(`renders retry button when unable to fetch alerts`, async () => {
  const HIGH_SENSITIVITY_CHECK: Check = {
    ...BASIC_HTTP_CHECK,
    alertSensitivity: AlertSensitivity.High,
  };

  server.use(
    apiRoute(`listChecks`, {
      result: () => {
        return {
          json: [HIGH_SENSITIVITY_CHECK],
        };
      },
    })
  );

  server.use(
    apiRoute(`getPromAlertRules`, {
      result: () => {
        return {
          status: 500,
          json: {},
        };
      },
    })
  );

  const { user } = await renderChecksPage();
  const refetchButton = await screen.findByLabelText('Unable to fetch alerting rules. Retry?');

  server.use(
    apiRoute(`getPromAlertRules`, {
      result: () => {
        return {
          status: 200,
          json: ALERTING_RULES,
        };
      },
    })
  );

  await user.click(refetchButton);
  const alertToggle = await screen.findByLabelText('Alert rules');
  expect(alertToggle).toBeInTheDocument();
});
