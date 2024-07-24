import React, { useState } from 'react';
import { getBackendSrv } from '@grafana/runtime';
import { Button, LinkButton } from '@grafana/ui';

import { ROUTES } from 'types';
import { hasPermission } from 'utils';
import { useMeta } from 'hooks/useMeta';

import { DisablePluginModal } from './DisablePluginModal';
import { getRoute } from './Routing.utils';

export const ConfigActions = ({ initialized }: { initialized?: boolean }) => {
  const [showDisableModal, setShowDisableModal] = useState(false);
  const meta = useMeta();
  const canEdit = hasPermission(`plugins:write`);

  const handleEnable = async () => {
    await getBackendSrv()
      .fetch({
        url: `/api/plugins/${meta.id}/settings`,
        method: 'POST',
        data: {
          enabled: true,
          pinned: true,
        },
      })
      .toPromise();
    window.location.reload();
  };

  if (!canEdit) {
    return null;
  }

  if (!meta.enabled) {
    return (
      <Button variant="primary" onClick={handleEnable}>
        Enable plugin
      </Button>
    );
  }

  if (initialized) {
    return (
      <>
        <Button variant="destructive" onClick={() => setShowDisableModal(true)}>
          Disable synthetic monitoring
        </Button>
        <DisablePluginModal isOpen={showDisableModal} onDismiss={() => setShowDisableModal(false)} />
      </>
    );
  }

  return (
    <LinkButton variant="primary" href={getRoute(ROUTES.Home)}>
      Setup
    </LinkButton>
  );
};
