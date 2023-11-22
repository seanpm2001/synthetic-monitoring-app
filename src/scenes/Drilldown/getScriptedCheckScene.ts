import {
  CustomVariable,
  EmbeddedScene,
  QueryVariable,
  SceneApp,
  SceneAppPage,
  SceneAppPageLike,
  SceneControlsSpacer,
  SceneDataTransformer,
  SceneFlexItem,
  SceneFlexLayout,
  SceneQueryRunner,
  SceneReactObject,
  SceneRefreshPicker,
  SceneRouteMatch,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';
import { VariableHide, VariableRefresh } from '@grafana/schema';

import { Check, DashboardSceneAppConfig, ROUTES } from 'types';
import { checkType } from 'utils';
import { QueryType } from 'datasource/types';
import { PLUGIN_URL_PATH } from 'components/constants';
import { EditCheckDrawer } from 'components/EditCheckDrawer';
import { ScriptedChecksListSceneObject } from 'components/ScriptedCheckList/ScriptedCheckList';
import { getLatencyByProbePanel, getReachabilityStat, getUptimeStat } from 'scenes/Common';

import { getScriptedLatencyByUrl } from '../Scripted/getScriptedLatencyByUrl';
import { getUpStatusOverTime } from '../Scripted/getUpStatusOverTime';

export function getChecksDrilldownScene({ metrics, logs, sm }: DashboardSceneAppConfig, checks: Check[]) {
  const timeRange = new SceneTimeRange({
    from: 'now-6h',
    to: 'now',
  });

  const queryRunner = new SceneQueryRunner({
    datasource: { uid: '-- Mixed --' },
    queries: [
      {
        datasource: { uid: sm.uid },
        refId: 'scriptedChecks',
        queryType: QueryType.ScriptedChecks,
        checks,
      },
      {
        datasource: metrics,
        editorMode: 'code',
        exemplar: false,
        expr: `
          # find the average uptime over the entire time range evaluating 'up' in 5 minute windows
          avg_over_time(
            (
              # the inner query is going to produce a non-zero value if there was at least one successful check during the 5 minute window
              # so make it a 1 if there was at least one success and a 0 otherwise
              ceil(
                # the number of successes across all probes
                sum by (instance, job) (increase(probe_all_success_sum{}[5m]) * on (instance, job, probe, config_version) sm_check_info{check_name=~".*" })
                /
                # the total number of times we checked across all probes
                (sum by (instance, job) (increase(probe_all_success_count[5m])) + 1) # + 1 because we want to make sure it goes to 1, not 2
              )
            )
            [$__range:5m]
          )
        `,
        format: 'table',
        hide: false,
        instant: true,
        interval: '',
        legendFormat: '',
        refId: 'uptime',
      },
      {
        datasource: metrics,
        expr: `
            sum by (instance, job)
            (
              rate(probe_all_success_sum[$__range])
              *
              on (instance, job, probe, config_version) group_left(check_name) max by (instance, job, probe, config_version, check_name) (sm_check_info{check_name=~".*" })
            )
            /
            sum by (instance, job)
            (
              rate(probe_all_success_count[$__range])
              *
              on (instance, job, probe, config_version) group_left(check_name) max by (instance, job, probe, config_version, check_name) (sm_check_info{check_name=~".*"})
            )`,
        format: 'table',
        instant: true,
        interval: '',
        legendFormat: '{{check_name}}-{{instance}}-uptime',
        refId: 'reachability',
      },
      {
        datasource: metrics,
        editorMode: 'code',
        exemplar: false,
        expr: `
          ceil(
            sum by (instance, job)
            (
              rate(probe_all_success_sum[5m])
              *
              on (instance, job, probe, config_version) group_left(check_name) max by (instance, job, probe, config_version, check_name) (sm_check_info{check_name=~".*" })
            )
            /
            sum by (instance, job)
            (
              rate(probe_all_success_count[5m])
              *
              on (instance, job, probe, config_version) group_left(check_name) max by (instance, job, probe, config_version, check_name) (sm_check_info{check_name=~".*" })
            )
          )
        `,
        format: 'table',
        hide: false,
        instant: true,
        interval: '',
        legendFormat: '{{check_name}}-{{instance}}-uptime',
        refId: 'state',
      },
      {
        datasource: metrics,
        expr: `
          sum by (instance, job)(
            (
              rate(probe_all_duration_seconds_sum{probe=~".*"}[$__range])
            )
          ) /
          sum by (instance, job)(
            (
              rate(probe_all_duration_seconds_count{probe=~".*"}[$__range])
            )
          )
        `,
        format: 'table',
        hide: false,
        instant: true,
        interval: '',
        refId: 'latency-protocol',
      },
      {
        datasource: metrics,
        expr: `
          sum by (job, instance) (
            sum_over_time(
              probe_http_total_duration_seconds{probe=~".*"}[$__range])
            ) 
          / 
          sum by (job, instance) (
            count_over_time(probe_http_total_duration_seconds{probe=~".*"}[$__range])
          )
        `,
        format: 'table',
        hide: false,
        instant: true,
        interval: '',
        refId: 'latency-k6',
      },
    ],
  });

  const transformed = new SceneDataTransformer({
    $data: queryRunner,
    transformations: [
      {
        id: 'merge',
        options: {},
      },
      {
        id: 'organize',
        options: {
          excludeByName: {
            Time: true,
            id: true,
            // check_name: false,
          },
          indexByName: {
            Time: 0,
            job: 1,
            instance: 2,
            probes: 4,
            'Value #state': 5,
            'Value #latency-protocol': 8,
            'Value #uptime': 6,
            'Value #reachability': 7,
            'Value #latency-k6': 9,
          },
          // renameByName: {
          //   'Value #': 'check type',
          // },
        },
      },
    ],
  });

  const variables = new SceneVariableSet({
    variables: [
      new CustomVariable({
        name: 'job',
        value: 'hi',
      }),
      new CustomVariable({
        name: 'instance',
        value: '',
      }),
    ],
  });

  return new SceneApp({
    pages: [
      new SceneAppPage({
        title: 'Checks',
        $variables: variables,
        url: `${PLUGIN_URL_PATH}${ROUTES.Checks}`,
        drilldowns: [
          {
            routePath: `${PLUGIN_URL_PATH}${ROUTES.Checks}/:id`,
            getPage: getCheckDrilldownPage({ metrics, logs, sm }, checks),
          },
        ],
        getScene: () => {
          return new EmbeddedScene({
            $timeRange: timeRange,
            body: new SceneFlexLayout({
              direction: 'column',
              children: [
                new SceneFlexItem({
                  $data: transformed,
                  body: new ScriptedChecksListSceneObject({}),
                }),
              ],
            }),
          });
        },
      }),
    ],
  });
}

function getCheckDrilldownPage(config: DashboardSceneAppConfig, checks: Check[]) {
  return function (routeMatch: SceneRouteMatch<{ id: string }>, parent: SceneAppPageLike) {
    // Retrieve handler from the URL params.
    const checkId = decodeURIComponent(routeMatch.params.id);
    const check = checks.find((c) => String(c.id) === checkId);
    const job = new CustomVariable({
      name: 'job',
      value: check?.job,
      hide: VariableHide.hideVariable,
    });
    const instance = new CustomVariable({
      name: 'instance',
      value: check?.target,
      hide: VariableHide.hideVariable,
    });
    const probes = new QueryVariable({
      includeAll: true,
      allValue: '.*',
      defaultToAll: true,
      isMulti: true,
      name: 'probe',
      query: `label_values(sm_check_info{check_name="${checkType(check?.settings ?? {})}"},probe)`,
      refresh: VariableRefresh.onDashboardLoad,
      datasource: config.metrics,
    });

    return new SceneAppPage({
      $variables: new SceneVariableSet({ variables: [probes, job, instance] }),
      url: `${PLUGIN_URL_PATH}${ROUTES.Checks}/${encodeURIComponent(checkId)}`,
      getParentPage: () => parent,
      title: `${check?.job} overview`,
      getScene: () => getCheckDrilldownScene(config, check),
    });
  };

  function getCheckDrilldownScene({ metrics }: DashboardSceneAppConfig, check?: Check) {
    const upStatusOverTime = getUpStatusOverTime(metrics);
    const uptime = getUptimeStat(metrics);
    const reachability = getReachabilityStat(metrics);

    const latencyByProbe = getLatencyByProbePanel(metrics);

    const latencyByUrl = getScriptedLatencyByUrl(metrics);

    return new EmbeddedScene({
      controls: [
        new VariableValueSelectors({}),
        new SceneControlsSpacer(),
        new SceneRefreshPicker({
          intervals: ['5s', '1m', '1h'],
          isOnCanvas: true,
          refresh: '1m',
        }),
        new SceneReactObject({
          component: EditCheckDrawer,
          props: {
            checkId: String(check?.id) ?? '',
          },
        }),
      ],
      body: new SceneFlexLayout({
        direction: 'row',
        children: [
          new SceneFlexItem({
            minHeight: 300,
            body: new SceneFlexLayout({
              direction: 'column',
              children: [
                new SceneFlexLayout({
                  direction: 'row',
                  height: 150,
                  children: [new SceneFlexItem({ body: uptime }), new SceneFlexItem({ body: reachability })],
                }),
                new SceneFlexLayout({
                  direction: 'row',
                  height: 150,
                  children: [new SceneFlexItem({ body: upStatusOverTime })],
                }),
                new SceneFlexLayout({
                  direction: 'row',
                  height: 400,
                  children: [new SceneFlexItem({ body: latencyByUrl }), new SceneFlexItem({ body: latencyByProbe })],
                }),
              ],
            }),
          }),
        ],
      }),
    });
  }
}
