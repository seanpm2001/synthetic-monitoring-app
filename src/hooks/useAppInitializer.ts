import { useContext, useState } from 'react';
import { DataSourceInstanceSettings, DataSourceJsonData } from '@grafana/data';
import { config, FetchError, getBackendSrv } from '@grafana/runtime';
import { isNumber } from 'lodash';

import { ROUTES } from 'types';
import { FaroEvent, reportError, reportEvent } from 'faro';
import { LinkedDatasourceInfo, SMOptions } from 'datasource/types';
import { InstanceContext } from 'contexts/InstanceContext';
import { LEGACY_LOGS_DS_NAME, LEGACY_METRICS_DS_NAME } from 'components/constants';
import { getRoute } from 'components/Routing.utils';

interface InitializeProps {
  metricsSettings: DataSourceInstanceSettings<DataSourceJsonData>;
  metricsHostedId: number;
  logsSettings: DataSourceInstanceSettings<DataSourceJsonData>;
  logsHostedId: number;
}

function getMetricsName(provisionedName?: string) {
  if (config.datasources[LEGACY_METRICS_DS_NAME]) {
    return LEGACY_METRICS_DS_NAME;
  }
  return provisionedName ?? '';
}

function getLogsName(provisionedName?: string) {
  if (config.datasources[LEGACY_LOGS_DS_NAME]) {
    return LEGACY_LOGS_DS_NAME;
  }
  return provisionedName ?? '';
}

function findDatasourceByNameAndUid(
  provisionedName: string,
  type: 'loki' | 'prometheus'
): {
  byName: DataSourceInstanceSettings<DataSourceJsonData> | undefined;
  byUid: DataSourceInstanceSettings<DataSourceJsonData> | undefined;
} {
  const byName = config.datasources[provisionedName];
  const byUid = Object.values(config.datasources).find((ds) => {
    if (type === 'loki') {
      return ds.uid === 'grafanacloud-logs';
    } else {
      return ds.uid === 'grafanacloud-metrics';
    }
  });
  return {
    byName,
    byUid,
  };
}

enum DatasourceStatus {
  NameOnly = 'NameOnly',
  Match = 'Match',
  Mismatch = 'Mismatch',
  UidOnly = 'UidOnly',
  NotFound = 'NotFound',
}

function ensureNameAndUidMatch(
  metricsByName?: DataSourceInstanceSettings<DataSourceJsonData>,
  metricsByUid?: DataSourceInstanceSettings<DataSourceJsonData>
): DatasourceStatus {
  if (!metricsByUid && !metricsByName) {
    return DatasourceStatus.NotFound;
  }
  if (!metricsByUid && metricsByName) {
    return DatasourceStatus.NameOnly;
  }
  if (metricsByUid && !metricsByName) {
    return DatasourceStatus.UidOnly;
  }
  if (metricsByUid && metricsByName) {
    if (metricsByUid.name === metricsByName.name) {
      return DatasourceStatus.Match;
    }
    return DatasourceStatus.Mismatch;
  }
  throw new Error('Invalid provisioning. Could not find datasources');
}

export const useAppInitializer = (redirectTo?: ROUTES) => {
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [datasourceModalOpen, setDataSouceModalOpen] = useState<boolean>(false);
  const { meta } = useContext(InstanceContext);

  const metricsName = getMetricsName(meta?.jsonData?.metrics.grafanaName);
  const { byName: metricsByName, byUid: metricsByUid } = findDatasourceByNameAndUid(metricsName, 'prometheus');
  const logsName = getLogsName(meta?.jsonData?.logs.grafanaName);
  const { byName: logsByName, byUid: logsByUid } = findDatasourceByNameAndUid(logsName, 'loki');
  const stackId = meta?.jsonData?.stackId;

  const handleClick = async () => {
    try {
      const metricsStatus = ensureNameAndUidMatch(metricsByName, metricsByUid);
      const logsStatus = ensureNameAndUidMatch(logsByName, logsByUid);

      if (metricsStatus === DatasourceStatus.NotFound) {
        throw new Error('Invalid plugin configuration. Could not find a metrics datasource');
      }
      if (logsStatus === DatasourceStatus.NotFound) {
        throw new Error('Invalid plugin configuration. Could not find a logs datasource');
      }
      // Either the plugin is running on prem and can find a datasource, or the provisioning matches with the default grafana cloud UIDs. Everything is good to go!
      if (
        (metricsStatus === DatasourceStatus.Match || metricsStatus === DatasourceStatus.NameOnly) &&
        metricsByName &&
        (logsStatus === DatasourceStatus.Match || logsStatus === DatasourceStatus.NameOnly) &&
        logsByName
      ) {
        const metricsHostedId = meta?.jsonData?.metrics.hostedId;
        if (!metricsHostedId) {
          throw new Error('Invalid plugin configuration. Could not find metrics datasource hostedId');
        }

        const logsHostedId = meta?.jsonData?.logs.hostedId;
        if (!logsHostedId) {
          throw new Error('Invalid plugin configuration. Could not find logs datasource hostedId');
        }

        await initialize({
          metricsSettings: metricsByName,
          metricsHostedId,
          logsSettings: logsByName,
          logsHostedId: logsHostedId,
        });

        return;
      }

      if (metricsStatus === DatasourceStatus.UidOnly || logsStatus === DatasourceStatus.UidOnly) {
        setDataSouceModalOpen(true);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Invalid plugin configuration. Could not find logs and metrics datasources');
    }
  };

  const initialize = async ({ metricsSettings, metricsHostedId, logsSettings, logsHostedId }: InitializeProps) => {
    reportEvent(FaroEvent.INIT);
    if (!meta?.jsonData) {
      reportError('Invalid plugin configuration', FaroEvent.INIT);
      setError('Invalid plugin configuration');
      return;
    }
    setLoading(true);
    const body = {
      stackId: isNumber(stackId) ? stackId : parseInt(stackId ?? '1', 10),
      metricsInstanceId: metricsHostedId,
      logsInstanceId: logsHostedId,
    };
    try {
      const { accessToken } = await getBackendSrv().request({
        url: `api/plugin-proxy/${meta.id}/install`,
        method: 'POST',
        data: body,
      });
      const datasourcePayload = {
        apiHost: meta.jsonData.apiHost,
        accessToken,
        metrics: {
          uid: metricsSettings.uid,
          grafanaName: metricsSettings.name,
          type: metricsSettings.type,
          hostedId: meta.jsonData.metrics?.hostedId,
        },
        logs: {
          uid: logsSettings.uid,
          grafanaName: logsSettings.name,
          type: logsSettings.type,
          hostedId: meta.jsonData.logs?.hostedId,
        },
      };

      await initializeDatasource(datasourcePayload);

      if (redirectTo) {
        window.location.href = `${window.location.origin}${getRoute(redirectTo)}`;
      } else {
        // force reload so that GrafanaBootConfig is updated.
        window.location.href = `${window.location.origin}${getRoute(ROUTES.Home)}`;
      }
    } catch (e) {
      const err = e as FetchError;
      const { data } = err;
      const msg = (err.message || data.message) ?? 'Something went wrong';
      console.log(e);
      setError(msg);
      setLoading(false);
      reportError(msg, FaroEvent.INIT);
    }
  };

  return {
    error,
    setError,
    loading,
    handleClick,
    metricsByName,
    metricsByUid,
    logsByName,
    logsByUid,
    initialize,
    datasourceModalOpen,
    setDataSouceModalOpen,
  };
};

interface DatasourcePayload {
  accessToken: string;
  apiHost: string;
  metrics: LinkedDatasourceInfo;
  logs: LinkedDatasourceInfo;
}

async function initializeDatasource(datasourcePayload: DatasourcePayload): Promise<SMOptions> {
  const existingDatasource = findSMDataSources()?.[0];
  if (existingDatasource) {
    return getBackendSrv().put(`api/datasources/${existingDatasource.id}`, {
      ...existingDatasource,
      access: 'proxy',
      isDefault: false,
      secureJsonData: {
        accessToken: datasourcePayload.accessToken,
      },
      jsonData: {
        apiHost: datasourcePayload.apiHost,
        initialized: true,
        metrics: datasourcePayload.metrics,
        logs: datasourcePayload.logs,
      },
    });
  }
  return createNewApiInstance(datasourcePayload);
}

// Used for stubbing out the datasource when plugin is not provisioned

async function createNewApiInstance(payload: DatasourcePayload): Promise<SMOptions> {
  return getBackendSrv().post('api/datasources', {
    name: 'Synthetic Monitoring',
    type: 'synthetic-monitoring-datasource',
    access: 'proxy',
    isDefault: false,
    jsonData: {
      apiHost: payload.apiHost,
      initialized: true,
      metrics: payload.metrics,
      logs: payload.logs,
    },
    secureJsonData: {
      accessToken: payload.accessToken,
    },
  });
}
/**
 * Find all synthetic-monitoring datasources
 */
function findSMDataSources(): Array<DataSourceInstanceSettings<SMOptions>> {
  return Object.values(config.datasources).filter((ds) => {
    return ds.type === 'synthetic-monitoring-datasource';
  }) as unknown as Array<DataSourceInstanceSettings<SMOptions>>;
}
