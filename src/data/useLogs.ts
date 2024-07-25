import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { DataFrameJSON, TimeRange } from '@grafana/data';

import { useSMDS } from 'hooks/useSMDS';

type Args = {
  expr: string;
  range: TimeRange;
};

export function useLogs() {
  const smDS = useSMDS();

  return useMutation<DataFrameJSON[], Error, Args, UseMutationResult>({
    mutationFn: async ({ expr, range }: Args) => {
      try {
        const res = await smDS.queryLogs(expr, range);
        return res;
      } catch (error) {
        throw error;
      }
    },
  });
}
