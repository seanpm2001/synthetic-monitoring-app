import { QueryKey } from '@tanstack/query-core';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getBackendSrv, getDataSourceSrv } from '@grafana/runtime';

import { MutationProps } from './types';
import { FaroEvent } from 'faro';
import { SMDataSource } from 'datasource/DataSource';
import { LinkedDatasourceInfo } from 'datasource/types';

export const queryKeys: Record<'list', QueryKey> = {
  list: ['get-sm-datasource'],
};

export function useGetSMDatasource() {
  return useQuery({
    queryKey: queryKeys.list,
    queryFn: () => getDataSourceSrv().get(`Synthetic Monitoring`) as Promise<SMDataSource>,
  });
}

interface GetAccessTokenPayload {
  data: {
    stackId: number;
    metricsInstanceId: number;
    logsInstanceId: number;
  };
  id: string;
}

export function useSMAccessToken({ eventInfo }: MutationProps = {}) {
  const eventType = FaroEvent.INITIALIZE_ACCESS_TOKEN;

  return useMutation({
    mutationFn: ({ data, id }: GetAccessTokenPayload) => {
      return getBackendSrv().post(`api/plugin-proxy/${id}/install`, { data });
    },
    meta: {
      event: {
        info: eventInfo,
        type: eventType,
      },
    },
  });
}

interface InitSMPayload {
  accessToken: string;
  apiHost: string;
  metrics: LinkedDatasourceInfo;
  logs: LinkedDatasourceInfo;
}

export function useInitSMDatasource({ eventInfo }: MutationProps = {}) {
  const eventType = FaroEvent.INIT;

  return useMutation({
    mutationFn: ({ apiHost, metrics, logs, accessToken }: InitSMPayload) =>
      getBackendSrv().post('api/datasources', {
        name: 'Synthetic Monitoring',
        type: 'synthetic-monitoring-datasource',
        access: 'proxy',
        isDefault: false,
        jsonData: {
          apiHost,
          initialized: true,
          metrics,
          logs,
        },
        secureJsonData: {
          accessToken,
        },
      }),
    meta: {
      event: {
        info: eventInfo,
        type: eventType,
      },
    },
  });
}
