import React, { useState } from 'react';
import { GrafanaTheme2 } from '@grafana/data';
import { useStyles2 } from '@grafana/ui';
import { css } from '@emotion/css';

import { CheckFormValuesHttp, CheckType } from 'types';
import { CheckIpVersion } from 'components/CheckEditor/FormComponents/CheckIpVersion';
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
import { Collapse } from 'components/Collapse';
import { LabelField } from 'components/LabelField';
import { TLSConfig } from 'components/TLSConfig';

const getStyles = (theme: GrafanaTheme2) => ({
  validationGroup: css`
    max-width: 400px;
  `,
  maxWidth: css`
    max-width: 500px;
  `,
});

export const HttpSettingsForm = () => {
  const [showHttpSettings, setShowHttpSettings] = useState(false);
  const [showAuthentication, setShowAuthentication] = useState(false);
  const [showValidation, setShowValidation] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const styles = useStyles2(getStyles);

  return (
    <div>
      <Collapse label="HTTP settings" onToggle={() => setShowHttpSettings(!showHttpSettings)} isOpen={showHttpSettings}>
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
      </Collapse>
      <TLSConfig checkType={CheckType.HTTP} />
      <Collapse
        label="Authentication"
        onToggle={() => setShowAuthentication(!showAuthentication)}
        isOpen={showAuthentication}
      >
        <HttpCheckBearerToken />
        <HttpCheckBasicAuthorization />
      </Collapse>
      <Collapse label="Validation" onToggle={() => setShowValidation(!showValidation)} isOpen={showValidation}>
        <div className={styles.validationGroup}>
          <HttpCheckValidStatusCodes />
          <HttpCheckValidHttpVersions />
          <HttpCheckSSLOptions />
        </div>
        <HttpCheckRegExValidation />
      </Collapse>
      <Collapse label="Advanced options" onToggle={() => setShowAdvanced(!showAdvanced)} isOpen={showAdvanced}>
        <div className={styles.maxWidth}>
          <LabelField<CheckFormValuesHttp> />
          <CheckIpVersion checkType={CheckType.HTTP} name="settings.http.ipVersion" />
          <HttpCheckFollowRedirects />
          <HttpCheckCacheBuster />
        </div>
      </Collapse>
    </div>
  );
};
