import React from 'react';

// import { Alert } from '@grafana/ui';
import { CheckFormValuesHttp, CheckType } from 'types';
import { CheckEnabled } from 'components/CheckEditor/FormComponents/CheckEnabled';
import { CheckIpVersion } from 'components/CheckEditor/FormComponents/CheckIpVersion';
import { CheckJobName } from 'components/CheckEditor/FormComponents/CheckJobName';
import { CheckPublishedAdvanceMetrics } from 'components/CheckEditor/FormComponents/CheckPublishedAdvanceMetrics';
import { CheckTarget } from 'components/CheckEditor/FormComponents/CheckTarget';
import { HttpCheckBasicAuthorization } from 'components/CheckEditor/FormComponents/HttpCheckBasicAuthorization';
import { HttpCheckBearerToken } from 'components/CheckEditor/FormComponents/HttpCheckBearerToken';
import { HttpCheckCacheBuster } from 'components/CheckEditor/FormComponents/HttpCheckCacheBuster';
import { HttpCheckCompressionOption } from 'components/CheckEditor/FormComponents/HttpCheckCompressionOption';
import { HttpCheckFollowRedirects } from 'components/CheckEditor/FormComponents/HttpCheckFollowRedirects';
import { HttpCheckProxyURL } from 'components/CheckEditor/FormComponents/HttpCheckProxyURL';
import { HttpCheckRegExValidation } from 'components/CheckEditor/FormComponents/HttpCheckRegExValidation';
import { HttpCheckSSLOptions } from 'components/CheckEditor/FormComponents/HttpCheckSSLOptions';
import { HttpCheckValidHttpVersions } from 'components/CheckEditor/FormComponents/HttpCheckValidHttpVersions';
import { HttpCheckValidStatusCodes } from 'components/CheckEditor/FormComponents/HttpCheckValidStatusCodes';
import { RequestBodyTextArea } from 'components/CheckEditor/FormComponents/RequestBodyTextArea';
import { RequestHeaders } from 'components/CheckEditor/FormComponents/RequestHeaders';
import { RequestMethodSelect } from 'components/CheckEditor/FormComponents/RequestMethodSelect';
import { ProbeOptions } from 'components/CheckEditor/ProbeOptions';
import { FormLayout } from 'components/CheckForm/FormLayout/FormLayout';
import { CheckFormAlert } from 'components/CheckFormAlert';
import { CheckUsage } from 'components/CheckUsage';
import { DocsLink } from 'components/DocsLink';
import { LabelField } from 'components/LabelField';
import { TLSConfig } from 'components/TLSConfig';

export const CheckHTTPLayout = () => {
  return (
    <FormLayout>
      <FormLayout.Section
        label="General settings"
        fields={[`enabled`, `job`, `target`, `probes`, `frequency`, `timeout`]}
        supportingContent={
          <>
            <CheckUsage />
            <DocsLink article="probes">Learn more about general settings</DocsLink>
          </>
        }
      >
        <CheckEnabled />
        <CheckJobName />
        <CheckTarget checkType={CheckType.HTTP} />
        <ProbeOptions checkType={CheckType.HTTP} />
        <CheckPublishedAdvanceMetrics />
      </FormLayout.Section>
      <FormLayout.Section
        label="HTTP settings"
        fields={[
          `settings.http.method`,
          `settings.http.body`,
          `settings.http.headers`,
          `settings.http.compression`,
          `settings.http.proxyConnectHeaders`,
        ]}
        supportingContent={<DocsLink article="probes">Learn more about http settings options</DocsLink>}
      >
        <RequestMethodSelect name="settings.http.method" />
        <RequestBodyTextArea name="settings.http.body" />
        <RequestHeaders
          description="The HTTP headers set for the probe."
          label="Request header"
          name="settings.http.headers"
        />
        <HttpCheckCompressionOption />
        <HttpCheckProxyURL />
        <RequestHeaders
          description="The HTTP headers sent to the proxy."
          label="Proxy connect header"
          name="settings.http.proxyConnectHeaders"
        />
      </FormLayout.Section>
      <FormLayout.Section
        label="Authentication"
        supportingContent={<DocsLink article="probes">Learn more about authentication options</DocsLink>}
      >
        <HttpCheckBearerToken />
        <HttpCheckBasicAuthorization />
      </FormLayout.Section>
      <FormLayout.Section
        label="TLS config"
        supportingContent={<DocsLink article="probes">Learn more about TLS config options</DocsLink>}
      >
        <TLSConfig checkType={CheckType.HTTP} />
      </FormLayout.Section>
      <FormLayout.Section
        label="Validation"
        supportingContent={<DocsLink article="probes">Learn more about advanced options</DocsLink>}
      >
        <HttpCheckValidStatusCodes />
        <HttpCheckValidHttpVersions />
        <HttpCheckSSLOptions />
        <HttpCheckRegExValidation />
      </FormLayout.Section>
      <FormLayout.Section
        label="Advanced options"
        supportingContent={<DocsLink article="probes">Learn more about advanced options</DocsLink>}
      >
        <LabelField<CheckFormValuesHttp> />
        <CheckIpVersion checkType={CheckType.HTTP} name="settings.http.ipVersion" />
        <HttpCheckFollowRedirects />
        <HttpCheckCacheBuster />
      </FormLayout.Section>
      <FormLayout.Section
        label="Alerting"
        fields={[`alertSensitivity`]}
        supportingContent={
          <>
            <DocsLink article="probes">Learn more about alerting sensitivity settings.</DocsLink>
            {/* <Alert severity="info" title="Tip">
              Adding multiple probes can help to prevent alert flapping for less frequent checks.
            </Alert> */}
          </>
        }
      >
        <CheckFormAlert />
      </FormLayout.Section>
    </FormLayout>
  );
};
