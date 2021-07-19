import {
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  FieldType,
  ArrayDataFrame,
  DataFrame,
  rangeUtil,
} from '@grafana/data';

import { SMQuery, SMOptions, QueryType, CheckInfo, MetricQuery } from './types';

import { config, getBackendSrv, getTemplateSrv } from '@grafana/runtime';
import { Probe, Check, RegistrationInfo, HostedInstance } from '../types';
import { queryMetric } from 'utils';

export class SMDataSource extends DataSourceApi<SMQuery, SMOptions> {
  constructor(public instanceSettings: DataSourceInstanceSettings<SMOptions>) {
    super(instanceSettings);
  }

  getMetricsDS() {
    return config.datasources[this.instanceSettings.jsonData.metrics.grafanaName];
  }

  async query(options: DataQueryRequest<SMQuery>): Promise<DataQueryResponse> {
    const data: DataFrame[] = [];
    for (const query of options.targets) {
      if (query.queryType === QueryType.Probes) {
        const probes = await this.listProbes();
        const frame = new ArrayDataFrame(probes);
        frame.setFieldType('onlineChange', FieldType.time, (s: number) => s * 1000); // seconds to ms
        frame.setFieldType('created', FieldType.time, (s: number) => s * 1000); // seconds to ms
        frame.setFieldType('modified', FieldType.time, (s: number) => s * 1000); // seconds to ms
        frame.refId = query.refId;
        data.push(frame);
      } else if (query.queryType === QueryType.Checks) {
        const checks = await this.listChecks();
        const frame = new ArrayDataFrame(checks);
        frame.setFieldType('created', FieldType.time, (s: number) => s * 1000); // seconds to ms
        frame.setFieldType('modified', FieldType.time, (s: number) => s * 1000); // seconds to ms
        frame.refId = query.refId;

        const copy: DataFrame = {
          ...frame,
          fields: frame.fields,
          length: checks.length,
        };

        data.push(copy);
      } else if (query.queryType === QueryType.Metric) {
        const metricResponse = await this.handleQueryMetric(query.metric, { ...options });
        const frames = metricResponse?.map<DataFrame>(({ metric, values }) => {
          return {
            name: metric.job,
            fields: [
              {
                name: 'Time',
                type: FieldType.time,
                values: values.map(([time, _]: [number, string]) => time * 1000),
                config: {},
              },
              {
                name: 'Value',
                type: FieldType.number,
                values: values.map(([_, value]: [number, string]) => parseFloat(value)),
                config: {},
              },
            ],
          } as DataFrame;
        });
        return { data: frames ?? [] };
        // const frame = new ArrayDataFrame(metricResponse ?? []);
        // frame.refId = query.refId;
        // frame.setFieldType('time', FieldType.time);
        // data.push(frame);
      }
    }
    return { data };
  }

  async handleQueryMetric(metricName: MetricQuery | undefined, options: DataQueryRequest<SMQuery>) {
    const secondsDiff = options.range.to.diff(options.range.from) / 1000;
    const interval = rangeUtil.intervalToSeconds(options.interval);
    const step = this.adjustInterval(interval, interval, secondsDiff, 1);
    const range = rangeUtil.secondsToHms(secondsDiff);

    switch (metricName) {
      case MetricQuery.Reachability: {
        const data = await this.queryPrometheus(
          `sum(rate(probe_all_success_sum[3h])) by (job, instance) / sum(rate(probe_all_success_count[3h])) by (job, instance)`,
          step,
          options
        );
        return data;
      }
      case MetricQuery.Uptime: {
        const query = `sum_over_time(
            (
              ceil(
                sum by (instance, job) (idelta(probe_all_success_sum[5m]))
                /
                sum by (instance, job) (idelta(probe_all_success_count[5m]))
              )
            )[${range}:] 
          )
          /
          count_over_time(
            (
                sum by (instance, job) (idelta(probe_all_success_count[5m]))
            )[${range}:]
          )`;

        const interpolated = getTemplateSrv().replace(query, options.scopedVars);
        const data = await this.queryPrometheus(interpolated, step, options);
        return data;
      }
      default:
        return [];
    }
  }

  adjustInterval(interval: number, minInterval: number, range: number, intervalFactor: number) {
    // Prometheus will drop queries that might return more than 11000 data points.
    // Calculate a safe interval as an additional minimum to take into account.
    // Fractional safeIntervals are allowed, however serve little purpose if the interval is greater than 1
    // If this is the case take the ceil of the value.
    let safeInterval = range / 11000;
    if (safeInterval > 1) {
      safeInterval = Math.ceil(safeInterval);
    }
    return Math.max(interval * intervalFactor, minInterval, safeInterval);
  }

  async queryPrometheus(query: string, step: number, options: DataQueryRequest<SMQuery>): Promise<any[]> {
    const prom = this.getMetricsDS();
    if (!prom.url) {
      throw new Error('Unable to find prometheus datasource');
    }
    const { error, data } = await queryMetric(prom.url, query, {
      start: options.range.from.unix(),
      end: options.range.to.unix(),
      step: step ?? 0,
    });
    if (error) {
      throw new Error(error);
    }
    return data;
  }

  async getCheckInfo(): Promise<CheckInfo> {
    return getBackendSrv()
      .fetch({
        method: 'GET',
        url: `${this.instanceSettings.url}/sm/checks/info`,
      })
      .toPromise()
      .then((res: any) => {
        return res.data as CheckInfo;
      });
  }

  //--------------------------------------------------------------------------------
  // PROBES
  //--------------------------------------------------------------------------------

  async listProbes(): Promise<Probe[]> {
    return getBackendSrv()
      .fetch({
        method: 'GET',
        url: `${this.instanceSettings.url}/sm/probe/list`,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async addProbe(probe: Probe): Promise<any> {
    return getBackendSrv()
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/probe/add`,
        data: probe,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async deleteProbe(id: number): Promise<any> {
    return getBackendSrv()
      .fetch({
        method: 'DELETE',
        url: `${this.instanceSettings.url}/sm/probe/delete/${id}`,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async updateProbe(probe: Probe): Promise<any> {
    console.log('updating probe.', probe);
    return getBackendSrv()
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/probe/update`,
        data: probe,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async resetProbeToken(probe: Probe): Promise<any> {
    console.log('updating probe.', probe);
    return getBackendSrv()
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/probe/update?reset-token=true`,
        data: probe,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  //--------------------------------------------------------------------------------
  // CHECKS
  //--------------------------------------------------------------------------------

  async listChecks(): Promise<Check[]> {
    return getBackendSrv()
      .fetch({
        method: 'GET',
        url: `${this.instanceSettings.url}/sm/check/list`,
      })
      .toPromise()
      .then((res: any) => (Array.isArray(res.data) ? res.data : []));
  }

  async addCheck(check: Check): Promise<any> {
    return getBackendSrv()
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/check/add`,
        data: check,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async deleteCheck(id: number): Promise<any> {
    return getBackendSrv()
      .fetch({
        method: 'DELETE',
        url: `${this.instanceSettings.url}/sm/check/delete/${id}`,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async updateCheck(check: Check): Promise<any> {
    console.log('updating check.', check);
    return getBackendSrv()
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/check/update`,
        data: check,
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async getTenant(): Promise<any> {
    return getBackendSrv()
      .fetch({ method: 'GET', url: `${this.instanceSettings.url}/sm/tenant` })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async disableTenant(): Promise<any> {
    const tenant = await this.getTenant();
    return getBackendSrv()
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/tenant/update`,
        data: {
          ...tenant,
          status: 1,
        },
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  //--------------------------------------------------------------------------------
  // SETUP
  //--------------------------------------------------------------------------------

  normalizeURL(url: string): string {
    if (url.startsWith('http://')) {
      return url;
    } else if (url.startsWith('https://')) {
      return url;
    } else {
      return 'https://' + url;
    }
  }

  async registerInit(apiHost: string, apiToken: string): Promise<RegistrationInfo> {
    const backendSrv = getBackendSrv();
    const data = {
      ...this.instanceSettings,
      jsonData: {
        apiHost: this.normalizeURL(apiHost),
      },
      access: 'proxy',
    };
    await backendSrv.put(`api/datasources/${this.instanceSettings.id}`, data);
    return backendSrv
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/register/init`,
        data: { apiToken },
        headers: {
          // ensure the grafana backend doesn't use a cached copy of the
          // datasource config, as it might not have the new apiHost set.
          'X-Grafana-NoCache': 'true',
        },
      })
      .toPromise()
      .then((res: any) => {
        return res.data;
      });
  }

  async onOptionsChange(options: SMOptions) {
    const data = {
      ...this.instanceSettings,
      jsonData: options,
      access: 'proxy',
    };
    const info = await getBackendSrv().put(`api/datasources/${this.instanceSettings.id}`, data);
    console.log('updated datasource config', info);
  }

  async registerSave(apiToken: string, options: SMOptions, accessToken: string): Promise<any> {
    const data = {
      ...this.instanceSettings,
      jsonData: options,
      secureJsonData: {
        accessToken,
      },
      access: 'proxy',
    };
    const info = await getBackendSrv().put(`api/datasources/${this.instanceSettings.id}`, data);
    console.log('Saved accessToken, now update our configs', info);

    // Note the accessToken above must be saved first!
    return await getBackendSrv().fetch({
      method: 'POST',
      url: `${this.instanceSettings.url}/sm/register/save`,
      headers: {
        // ensure the grafana backend doesn't use a cached copy of the
        // datasource config, as it might not have the new accessToken set.
        'X-Grafana-NoCache': 'true',
      },
      data: {
        apiToken,
        metricsInstanceId: options.metrics.hostedId,
        logsInstanceId: options.logs.hostedId,
      },
    });
  }

  async getViewerToken(apiToken: string, instance: HostedInstance): Promise<string> {
    return getBackendSrv()
      .fetch({
        method: 'POST',
        url: `${this.instanceSettings.url}/sm/register/viewer-token`,
        data: {
          apiToken,
          id: instance.id,
          type: instance.type,
        },
      })
      .toPromise()
      .then((res: any) => {
        return res.data?.token;
      });
  }

  //--------------------------------------------------------------------------------
  // TEST
  //--------------------------------------------------------------------------------

  async testDatasource() {
    const probes = await this.listProbes();
    if (probes.length) {
      return {
        status: 'OK',
        mesage: `Found ${probes.length} probes`,
      };
    }
    return {
      status: 'Error',
      mesage: 'unable to connect',
    };
  }
}
