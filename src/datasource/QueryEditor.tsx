import React, { PureComponent } from 'react';
import { defaults } from 'lodash';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { SMDataSource } from './DataSource';
import { SMQuery, SMOptions, QueryType, defaultQuery, MetricQuery } from './types';
import { HorizontalGroup, Select } from '@grafana/ui';
import { FeatureFlagContext } from 'contexts/FeatureFlagContext';
import { FeatureName } from 'types';

type Props = QueryEditorProps<SMDataSource, SMQuery, SMOptions>;

interface State {}

const types = [
  { label: 'Probes', value: QueryType.Probes },
  { label: 'Checks', value: QueryType.Checks },
];

export class QueryEditor extends PureComponent<Props, State> {
  static contextType = FeatureFlagContext;

  onComponentDidMount() {}

  // onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   const { onChange, query } = this.props;
  //   onChange({ ...query, queryText: event.target.value });
  // };

  // onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
  //   const { onChange, query, onRunQuery } = this.props;
  //   onChange({ ...query, constant: parseFloat(event.target.value) });
  //   onRunQuery(); // executes the query
  // };

  onQueryTypeChanged = (item: SelectableValue<QueryType>) => {
    const { onChange, onRunQuery, query } = this.props;
    onChange({
      ...query,
      queryType: item.value!,
    });
    onRunQuery();
  };

  onMetricChanged = (item: SelectableValue<MetricQuery>) => {
    const { onChange, onRunQuery, query } = this.props;
    onChange({
      ...query,
      metric: item.value,
    });
    onRunQuery();
  };

  render() {
    const { isFeatureEnabled } = this.context;
    const metricQueries = isFeatureEnabled(FeatureName.MetricQueries);
    const query = defaults(this.props.query, defaultQuery);

    return (
      <div className="gf-form">
        <HorizontalGroup style={{ minWidth: '100%' }}>
          <Select
            options={metricQueries ? [...types, { label: 'Metric', value: QueryType.Metric }] : types}
            value={types.find((t) => t.value === query.queryType)}
            onChange={this.onQueryTypeChanged}
          />
          {query.queryType === QueryType.Metric && (
            <Select
              options={[
                {
                  label: 'Uptime',
                  value: MetricQuery.Uptime,
                },
                {
                  label: 'Reachability',
                  value: MetricQuery.Reachability,
                },
              ]}
              onChange={this.onMetricChanged}
            />
          )}
        </HorizontalGroup>
      </div>
    );
  }
}
