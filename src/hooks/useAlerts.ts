import { useEffect, useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';

import { AlertFamily, AlertRule, AlertSensitivity } from 'types';
import { useMetricsDS } from 'data/useMetricsDS';
import {
  ALERT_PROBE_SUCCESS_RECORDING_EXPR,
  ALERT_PROBE_SUCCESS_RECORDING_METRIC,
  DEFAULT_ALERT_LABELS,
  DEFAULT_ALERT_NAMES_BY_FAMILY_AND_SENSITIVITY,
  getDefaultAlertAnnotations,
  SM_ALERTING_NAMESPACE,
} from 'components/constants';

import { useGrafanaVersion } from './useGrafanaVersion';

enum AlertThresholds {
  High = 95,
  Medium = 90,
  Low = 75,
}

export const defaultRules = {
  name: 'default',
  rules: [
    {
      record: ALERT_PROBE_SUCCESS_RECORDING_METRIC,
      expr: ALERT_PROBE_SUCCESS_RECORDING_EXPR,
    },
    {
      alert: DEFAULT_ALERT_NAMES_BY_FAMILY_AND_SENSITIVITY[AlertFamily.ProbeSuccess][AlertSensitivity.High],
      expr: `${ALERT_PROBE_SUCCESS_RECORDING_METRIC}{alert_sensitivity="${AlertSensitivity.High}"} < ${AlertThresholds.High}`,
      for: '5m',
      labels: DEFAULT_ALERT_LABELS,
      annotations: getDefaultAlertAnnotations(AlertThresholds.High),
    },
    {
      alert: DEFAULT_ALERT_NAMES_BY_FAMILY_AND_SENSITIVITY[AlertFamily.ProbeSuccess][AlertSensitivity.Medium],
      expr: `${ALERT_PROBE_SUCCESS_RECORDING_METRIC}{alert_sensitivity="${AlertSensitivity.Medium}"} < ${AlertThresholds.Medium}`,
      for: '5m',
      labels: DEFAULT_ALERT_LABELS,
      annotations: getDefaultAlertAnnotations(AlertThresholds.Medium),
    },
    {
      alert: DEFAULT_ALERT_NAMES_BY_FAMILY_AND_SENSITIVITY[AlertFamily.ProbeSuccess][AlertSensitivity.Low],
      expr: `${ALERT_PROBE_SUCCESS_RECORDING_METRIC}{alert_sensitivity="${AlertSensitivity.Low}"} < ${AlertThresholds.Low}`,
      for: '5m',
      labels: DEFAULT_ALERT_LABELS,
      annotations: getDefaultAlertAnnotations(AlertThresholds.Low),
    },
  ],
};

interface RuleResponse {
  rules: AlertRule[];
  error?: string;
}

const fetchSMRules = (metricInstanceIdentifier: string | number): Promise<RuleResponse> =>
  getBackendSrv()
    .fetch<any>({
      method: 'GET',
      url: `/api/ruler/${metricInstanceIdentifier}/api/v1/rules/${SM_ALERTING_NAMESPACE}/default`,
      showErrorAlert: false,
    })
    .toPromise()
    .then((resp) => {
      return { rules: resp?.data?.rules ?? [] };
    })
    .catch((e) => {
      if (e.status === 404) {
        return { rules: [] };
      }
      return { rules: [], error: e.data?.message ?? 'We ran into a problem and could not fetch the alert rules' };
    });

export function useAlerts() {
  const [alertRules, setAlertRules] = useState<AlertRule[]>();
  const [defaultRulesSetCount, setDefaultRulesSetCount] = useState(0);
  const [alertError, setAlertError] = useState('');
  const [metricsIdentifier, setMetricsIdentifier] = useState<string | number>('');
  const { major: grafanaVersion } = useGrafanaVersion();
  const metricsDS = useMetricsDS();

  useEffect(() => {
    // There was a breaking change in the alert ruler api in Grafana v9. It switched from fetching by datasource ID to fetching by datasource UID.
    const id = grafanaVersion >= 9 ? metricsDS.uid : metricsDS.id;
    if (id) {
      setMetricsIdentifier(id);
    }
  }, [metricsDS, grafanaVersion]);

  const setDefaultRules = async () => {
    if (!metricsDS) {
      return;
    }
    await getBackendSrv()
      .fetch({
        url: `/api/ruler/${metricsIdentifier}/api/v1/rules/${SM_ALERTING_NAMESPACE}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: defaultRules,
      })
      .toPromise();

    setDefaultRulesSetCount(defaultRulesSetCount + 1);
  };

  const setRules = async (rules: AlertRule[]) => {
    const ruleGroup = {
      name: 'default',
      rules,
    };

    const updateResponse = getBackendSrv()
      .fetch({
        url: `/api/ruler/${metricsIdentifier}/api/v1/rules/${SM_ALERTING_NAMESPACE}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        data: ruleGroup,
      })
      .toPromise();

    setDefaultRulesSetCount(defaultRulesSetCount + 1);

    return updateResponse;
  };

  useEffect(() => {
    if (!metricsIdentifier) {
      return;
    }

    fetchSMRules(metricsIdentifier).then(({ rules, error }) => {
      setAlertRules(rules);
      if (error) {
        setAlertError(error);
      }
    });
  }, [defaultRulesSetCount, metricsDS, metricsIdentifier]);

  return {
    alertRules,
    alertError,
    setDefaultRules,
    setRules,
  };
}
