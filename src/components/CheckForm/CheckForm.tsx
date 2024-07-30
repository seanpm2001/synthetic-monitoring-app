import React, { forwardRef, RefObject, useCallback, useState } from 'react';
import { FormProvider, SubmitErrorHandler, SubmitHandler, useForm } from 'react-hook-form';
import { useParams } from 'react-router-dom';
import { GrafanaTheme2 } from '@grafana/data';
import { Alert, Button, Stack, Tooltip, useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';
import { zodResolver } from '@hookform/resolvers/zod';
import { DataTestIds } from 'test/dataTestIds';

import { Check, CheckFormPageParams, CheckFormValues, CheckType } from 'types';
import { AdHocCheckResponse } from 'datasource/responses.types';
import { useCanReadLogs, useCanWriteSM } from 'hooks/useDSPermission';
import { useLimits } from 'hooks/useLimits';
import { toFormValues } from 'components/CheckEditor/checkFormTransformations';
import { CheckJobName } from 'components/CheckEditor/FormComponents/CheckJobName';
import { ChooseCheckType } from 'components/CheckEditor/FormComponents/ChooseCheckType';
import { ProbeOptions } from 'components/CheckEditor/ProbeOptions';
import { DNSCheckLayout } from 'components/CheckForm/FormLayouts/CheckDNSLayout';
import { GRPCCheckLayout } from 'components/CheckForm/FormLayouts/CheckGrpcLayout';
import { HttpCheckLayout } from 'components/CheckForm/FormLayouts/CheckHttpLayout';
import { MultiHTTPCheckLayout } from 'components/CheckForm/FormLayouts/CheckMultiHttpLayout';
import { PingCheckLayout } from 'components/CheckForm/FormLayouts/CheckPingLayout';
import { ScriptedCheckLayout } from 'components/CheckForm/FormLayouts/CheckScriptedLayout';
import { TCPCheckLayout } from 'components/CheckForm/FormLayouts/CheckTCPLayout';
import { TracerouteCheckLayout } from 'components/CheckForm/FormLayouts/CheckTracerouteLayout';
import { LayoutSection } from 'components/CheckForm/FormLayouts/Layout.types';
import { CheckFormAlert } from 'components/CheckFormAlert';
import { CheckTestResultsModal } from 'components/CheckTestResultsModal';
import { CheckUsage } from 'components/CheckUsage';
import { fallbackCheckMap } from 'components/constants';
import { LabelField } from 'components/LabelField';
import { OverLimitAlert } from 'components/OverLimitAlert';
import { PluginPage } from 'components/PluginPage';

import { CheckFormContextProvider, useCheckFormContext } from './CheckFormContext/CheckFormContext';
import { BrowserCheckLayout } from './FormLayouts/CheckBrowserLayout';
import { useCheckForm, useCheckFormSchema } from './checkForm.hooks';
import { FormLayout } from './FormLayout';
import { useFormCheckType } from './useCheckType';

const layoutMap = {
  [CheckType.HTTP]: HttpCheckLayout,
  [CheckType.MULTI_HTTP]: MultiHTTPCheckLayout,
  [CheckType.Scripted]: ScriptedCheckLayout,
  [CheckType.PING]: PingCheckLayout,
  [CheckType.DNS]: DNSCheckLayout,
  [CheckType.TCP]: TCPCheckLayout,
  [CheckType.Traceroute]: TracerouteCheckLayout,
  [CheckType.GRPC]: GRPCCheckLayout,
  [CheckType.Browser]: BrowserCheckLayout,
};

const checkTypeStep1Label = {
  [CheckType.DNS]: `Request`,
  [CheckType.HTTP]: `Request`,
  [CheckType.MULTI_HTTP]: `Requests`,
  [CheckType.Scripted]: `Script`,
  [CheckType.PING]: `Request`,
  [CheckType.TCP]: `Request`,
  [CheckType.Traceroute]: `Request`,
  [CheckType.GRPC]: `Request`,
  [CheckType.Browser]: `Script`,
};

type CheckFormProps = {
  check?: Check;
  disabled?: boolean;
  pageTitle: string;
};

export const CheckForm = ({ check, disabled, pageTitle }: CheckFormProps) => {
  const canEdit = useCanWriteSM();
  const canReadLogs = useCanReadLogs();
  const [openTestCheckModal, setOpenTestCheckModal] = useState(false);
  const [adhocTestData, setAdhocTestData] = useState<AdHocCheckResponse>();
  const checkType = useFormCheckType(check);
  const { checkTypeGroup } = useParams<CheckFormPageParams>();
  const initialCheck = check || fallbackCheckMap[checkType];
  const schema = useCheckFormSchema(check);
  const styles = useStyles2(getStyles);
  const isExistingCheck = Boolean(check);
  const { isLoading, isOverCheckLimit, isOverScriptedLimit, isReady } = useLimits();
  const overLimit =
    isOverCheckLimit || ([CheckType.MULTI_HTTP, CheckType.Scripted].includes(checkType) && isOverScriptedLimit);
  const isDisabled = disabled || !canEdit || getLimitDisabled({ isExistingCheck, isLoading, overLimit });

  const formMethods = useForm<CheckFormValues>({
    defaultValues: toFormValues(initialCheck, checkType),
    shouldFocusError: false, // we manage focus manually
    resolver: zodResolver(schema),
  });

  const { error, handleInvalid, handleValid, testButtonRef, testCheckError, testCheckPending } = useCheckForm({
    check,
    checkType,
    onTestSuccess: (data) => {
      setAdhocTestData(data);
      setOpenTestCheckModal(true);
    },
  });

  const handleSubmit = (onValid: SubmitHandler<CheckFormValues>, onInvalid: SubmitErrorHandler<CheckFormValues>) =>
    formMethods.handleSubmit(onValid, onInvalid);

  const layout = layoutMap[checkType];

  const defineCheckSection = layout[LayoutSection.Check];
  const defineCheckFields = defineCheckSection?.fields || [];
  const CheckComponent = defineCheckSection?.Component;

  const defineUptimeSection = layout[LayoutSection.Uptime];
  const defineUptimeFields = defineUptimeSection?.fields || [];
  const UptimeComponent = defineUptimeSection?.Component;

  const probesSection = layout[LayoutSection.Probes];
  const probesFields = probesSection?.fields || [];
  const ProbesComponent = probesSection?.Component;

  const labelsSection = layout[LayoutSection.Labels];
  const labelsFields = labelsSection?.fields || [];
  const labelsComponent = labelsSection?.Component;

  const closeModal = useCallback(() => {
    setOpenTestCheckModal(false);
  }, []);

  const actions = constructActions({
    canReadLogs,
    checkType,
    disabled: isDisabled,
    loading: testCheckPending,
    ref: testButtonRef,
  });

  const alerts = (error || testCheckError) && (
    <Stack direction={`column`}>
      {error && (
        <Alert title="Save failed" severity="error">
          {error.message}
        </Alert>
      )}
      {testCheckError && (
        <Alert title="Test failed" severity="error">
          {testCheckError.message}
        </Alert>
      )}
    </Stack>
  );

  // console.log(formMethods.formState.errors);
  // console.log(formMethods.watch());

  return (
    <PluginPage pageNav={{ text: pageTitle }}>
      <FormProvider {...formMethods}>
        <CheckFormContextProvider disabled={isDisabled}>
          <div className={styles.wrapper} data-testid={isReady ? DataTestIds.PAGE_READY : DataTestIds.PAGE_NOT_READY}>
            <FormLayout
              actions={actions}
              alerts={alerts}
              disabled={isDisabled}
              onSubmit={handleSubmit}
              onValid={handleValid}
              onInvalid={handleInvalid}
              schema={schema}
            >
              {!isExistingCheck && <OverLimitAlert checkType={checkType} />}
              <FormLayout.Section label={checkTypeStep1Label[checkType]} fields={[`job`, ...defineCheckFields]}>
                <Stack direction={`column`} gap={4}>
                  <CheckJobName />
                  <Stack direction={`column`} gap={2}>
                    <ChooseCheckType checkType={checkType} checkTypeGroup={checkTypeGroup} disabled={isExistingCheck} />
                    {CheckComponent}
                  </Stack>
                </Stack>
              </FormLayout.Section>
              <FormLayout.Section label="Define uptime" fields={defineUptimeFields}>
                {UptimeComponent}
              </FormLayout.Section>
              <FormLayout.Section label="Labels" fields={[`labels`, ...labelsFields]}>
                {labelsComponent}
                <CheckLabels />
              </FormLayout.Section>
              <FormLayout.Section label="Alerting" fields={[`alertSensitivity`]}>
                <CheckFormAlert />
              </FormLayout.Section>
              <FormLayout.Section label="Execution" fields={[`probes`, `frequency`, ...probesFields]}>
                <CheckProbeOptions checkType={checkType} />
                {ProbesComponent}
                <CheckUsage checkType={checkType} />
              </FormLayout.Section>
            </FormLayout>
          </div>
        </CheckFormContextProvider>
      </FormProvider>
      <CheckTestResultsModal isOpen={openTestCheckModal} onDismiss={closeModal} testResponse={adhocTestData} />
    </PluginPage>
  );
};

const CheckLabels = () => {
  const { isFormDisabled } = useCheckFormContext();

  return <LabelField disabled={isFormDisabled} labelDestination="check" />;
};

const CheckProbeOptions = ({ checkType }: { checkType: CheckType }) => {
  const { isFormDisabled } = useCheckFormContext();

  return <ProbeOptions checkType={checkType} disabled={isFormDisabled} />;
};

interface GetIsDisabledProps {
  isExistingCheck: boolean;
  isLoading: boolean;
  overLimit: boolean;
}

function getLimitDisabled({ isExistingCheck, isLoading, overLimit }: GetIsDisabledProps) {
  if (isExistingCheck) {
    return false;
  }

  if (isLoading || overLimit) {
    return true;
  }

  return false;
}

interface ConstructActionsProps {
  canReadLogs: boolean;
  checkType: CheckType;
  disabled: boolean;
  loading: boolean;
  ref: RefObject<HTMLButtonElement>;
}

function constructActions({ checkType, ...rest }: ConstructActionsProps) {
  return checkType !== CheckType.Traceroute
    ? [
        {
          index: 4,
          element: <TestButton {...rest} />,
        },
      ]
    : [];
}

const TestButton = forwardRef<HTMLButtonElement, Omit<ConstructActionsProps, 'checkType'>>(
  ({ disabled, canReadLogs, loading }, ref) => {
    const content = (
      <Button
        disabled={disabled || !canReadLogs}
        icon={loading ? `fa fa-spinner` : undefined}
        ref={ref}
        type="submit"
        variant={`secondary`}
      >
        Test
      </Button>
    );

    if (!canReadLogs) {
      return (
        <Tooltip content="You need permission to read logs to test checks.">
          <span>{content}</span>
        </Tooltip>
      );
    }

    return content;
  }
);

TestButton.displayName = `TestButton`;

const getStyles = (theme: GrafanaTheme2) => ({
  wrapper: css({
    paddingTop: theme.spacing(2),
    height: `100%`,
  }),
});
