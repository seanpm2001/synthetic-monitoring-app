import React from 'react';
import { useFormContext } from 'react-hook-form';
import { OrgRole } from '@grafana/data';
import { Field, Input } from '@grafana/ui';

import { CheckFormValuesHttp } from 'types';
import { hasRole } from 'utils';

export const HttpCheckBearerToken = () => {
  const isEditor = hasRole(OrgRole.Editor);
  const { formState, register } = useFormContext<CheckFormValuesHttp>();
  const id = 'bearerToken';

  return (
    <Field
      htmlFor={id}
      disabled={!isEditor}
      label="Include bearer authorization header in request"
      invalid={Boolean(formState.errors.settings?.http?.bearerToken)}
      error={formState.errors.settings?.http?.bearerToken?.message}
      required
    >
      <Input
        {...register('settings.http.bearerToken', {
          required: { value: true, message: 'Bearer Token is required' },
        })}
        id={id}
        type="password"
        placeholder="Bearer token"
        disabled={!isEditor}
        data-fs-element="Bearer token input"
      />
    </Field>
  );
};
