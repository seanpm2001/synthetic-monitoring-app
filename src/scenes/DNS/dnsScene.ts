import {
  EmbeddedScene,
  SceneControlsSpacer,
  SceneDataLayerControls,
  SceneFlexItem,
  SceneFlexLayout,
  SceneRefreshPicker,
  SceneTimePicker,
  SceneTimeRange,
  SceneVariableSet,
  VariableValueSelectors,
} from '@grafana/scenes';

import { Check, CheckType, DashboardSceneAppConfig } from 'types';
import {
  getAvgLatencyStat,
  getErrorLogs,
  getErrorRateMapPanel,
  getFrequencyStat,
  getLatencyByProbePanel,
  getReachabilityStat,
  getUptimeStat,
  getVariables,
} from 'scenes/Common';
import { getAlertAnnotations } from 'scenes/Common/alertAnnotations';
import { getEditButton } from 'scenes/Common/editButton';
import { getEmptyScene } from 'scenes/Common/emptyScene';
import { getErrorRateTimeseries } from 'scenes/HTTP/errorRateTimeseries';
import { getMinStepFromFrequency } from 'scenes/utils';

import { getAnswerRecordsStat } from './answerRecords';
import { getResourcesRecordsPanel } from './resourceRecords';

export function getDNSScene({ metrics, logs, singleCheckMode }: DashboardSceneAppConfig, checks: Check[]) {
  return () => {
    if (checks.length === 0) {
      return getEmptyScene(CheckType.DNS);
    }

    const timeRange = new SceneTimeRange({
      from: 'now-1h',
      to: 'now',
    });

    const { probe, job, instance } = getVariables(CheckType.DNS, metrics, checks, singleCheckMode);

    const variables = new SceneVariableSet({ variables: [probe, job, instance] });

    const minStep = getMinStepFromFrequency(checks?.[0]?.frequency);
    const errorMap = getErrorRateMapPanel(metrics, minStep);
    const uptime = getUptimeStat(metrics, minStep);
    const reachability = getReachabilityStat(metrics, minStep);
    const avgLatency = getAvgLatencyStat(metrics, minStep);
    const answerRecords = getAnswerRecordsStat(metrics);
    const frequency = getFrequencyStat(metrics);

    const statRow = new SceneFlexLayout({
      direction: 'row',
      children: [uptime, reachability, avgLatency, answerRecords, frequency].map((panel) => {
        return new SceneFlexItem({ height: 90, body: panel });
      }),
    });

    const errorRateTimeseries = getErrorRateTimeseries(metrics, minStep);
    const topRight = new SceneFlexLayout({
      direction: 'column',
      children: [new SceneFlexItem({ height: 90, body: statRow }), new SceneFlexItem({ body: errorRateTimeseries })],
    });

    const topRow = new SceneFlexLayout({
      direction: 'row',
      children: [new SceneFlexItem({ height: 500, width: 500, body: errorMap }), new SceneFlexItem({ body: topRight })],
    });

    const latencyByProbe = getLatencyByProbePanel(metrics);
    const resourceRecords = getResourcesRecordsPanel(metrics);

    const latencyRow = new SceneFlexLayout({
      direction: 'row',
      children: [latencyByProbe, resourceRecords].map((panel) => new SceneFlexItem({ body: panel, height: 300 })),
    });

    const logsRow = new SceneFlexLayout({
      direction: 'row',
      children: [new SceneFlexItem({ height: 500, body: getErrorLogs(logs) })],
    });

    const editButton = getEditButton({ job, instance });

    const annotations = getAlertAnnotations(metrics);

    return new EmbeddedScene({
      $timeRange: timeRange,
      $variables: variables,
      $data: annotations,
      controls: [
        new VariableValueSelectors({}),
        new SceneDataLayerControls(),
        new SceneControlsSpacer(),
        editButton,
        new SceneTimePicker({ isOnCanvas: true }),
        new SceneRefreshPicker({
          intervals: ['5s', '1m', '1h'],
          isOnCanvas: true,
          refresh: '1m',
        }),
      ],
      body: new SceneFlexLayout({
        direction: 'column',
        children: [topRow, latencyRow, logsRow].map((flexItem) => new SceneFlexItem({ body: flexItem })),
      }),
    });
  };
}
