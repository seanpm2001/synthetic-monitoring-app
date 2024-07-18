import React, { useCallback } from 'react';

import { LayoutSection, Section } from './Layout.types';
import { CheckFormValuesDns } from 'types';
import { DNSRequestFields } from 'components/CheckEditor/CheckEditor.types';
import { CheckPublishedAdvanceMetrics } from 'components/CheckEditor/FormComponents/CheckPublishedAdvanceMetrics';
import { DNSCheckResponseMatches } from 'components/CheckEditor/FormComponents/DNSCheckResponseMatches';
import { DNSCheckValidResponseCodes } from 'components/CheckEditor/FormComponents/DNSCheckValidResponseCodes';
import { DNSRequest } from 'components/CheckEditor/FormComponents/DNSRequest';
import { Timeout } from 'components/CheckEditor/FormComponents/Timeout';

import { useCheckFormContext } from '../CheckFormContext/CheckFormContext';

export const DNS_REQUEST_FIELDS: DNSRequestFields = {
  target: {
    name: `target`,
  },
  ipVersion: {
    name: `settings.dns.ipVersion`,
  },
  recordType: {
    name: `settings.dns.recordType`,
  },
  server: {
    name: `settings.dns.server`,
  },
  protocol: {
    name: `settings.dns.protocol`,
  },
  port: {
    name: `settings.dns.port`,
  },
};

const CheckDNSRequest = () => {
  const { isFormDisabled, supportingContent } = useCheckFormContext();
  const { addRequest } = supportingContent;

  const onTest = useCallback(() => {
    addRequest(DNS_REQUEST_FIELDS);
  }, [addRequest]);

  return <DNSRequest disabled={isFormDisabled} fields={DNS_REQUEST_FIELDS} onTest={onTest} />;
};

export const DNSCheckLayout: Partial<Record<LayoutSection, Section<CheckFormValuesDns>>> = {
  [LayoutSection.Check]: {
    fields: [`target`],
    Component: (
      <>
        <CheckDNSRequest />
      </>
    ),
  },
  [LayoutSection.Uptime]: {
    fields: [`settings.dns.validRCodes`, `settings.dns.validations`],
    Component: (
      <>
        <DNSCheckValidResponseCodes />
        <DNSCheckResponseMatches />
        <Timeout />
      </>
    ),
  },

  [LayoutSection.Probes]: {
    fields: [],
    Component: (
      <>
        <CheckPublishedAdvanceMetrics />
      </>
    ),
  },
};
