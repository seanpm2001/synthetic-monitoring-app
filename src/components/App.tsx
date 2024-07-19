import React, { useEffect } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AppRootProps } from '@grafana/data';
import { css, Global } from '@emotion/react';

import { GlobalSettings } from 'types';
import { InstanceContextProvider } from 'contexts/InstanceContext';
import { PermissionsContextProvider } from 'contexts/PermissionsContext';
import { queryClient } from 'data/queryClient';
import { queryKeys as alertingQueryKeys } from 'data/useAlerts';
import { Routing } from 'components/Routing';

import { FeatureFlagProvider } from './FeatureFlagProvider';

type AppProps = AppRootProps<GlobalSettings>;

export const App = (props: AppProps) => {
  const { meta } = props;

  useEffect(() => {
    return () => {
      // we have a dependency on alerts to display our alerting correctly
      // so we are invalidating the alerts list on the assumption the user might change their alerting options when they leave SM
      // going to leave this despite it being a little bit buggy as the idea is correct (well, it should be invalidatQueries...)
      // alerting have some aggressive caching going on so I'm finding testing this hard
      queryClient.removeQueries({ queryKey: alertingQueryKeys.list });
    };
  }, [meta.jsonData?.metrics.uid]);

  return (
    <QueryClientProvider client={queryClient}>
      <FeatureFlagProvider>
        <GlobalStyles />
        <InstanceContextProvider meta={meta}>
          <PermissionsContextProvider>
            <Routing {...props} />
            <ReactQueryDevtools />
          </PermissionsContextProvider>
        </InstanceContextProvider>
      </FeatureFlagProvider>
    </QueryClientProvider>
  );
};

const GlobalStyles = () => {
  return (
    <Global
      styles={css({
        ['kbd']: {
          backgroundColor: '#eee',
          borderRadius: '3px',
          border: '1px solid #b4b4b4',
          boxShadow: '0 1px 1px rgba(0, 0, 0, 0.2), 0 2px 0 0 rgba(255, 255, 255, 0.7) inset',
          color: '#333',
          display: 'inline-block',
          fontSize: '0.85em',
          fontWeight: 700,
          lineHeight: 1,
          padding: '2px 4px',
          whiteSpace: 'nowrap',
        },
      })}
    />
  );
};
