import React from 'react';
import { screen } from '@testing-library/react';
import { LogsDSSettings, MetricsDSSettings, SMDSSettings } from 'test/fixtures/datasources';
import { CREATE_ACCESS_TOKEN } from 'test/fixtures/tokens';
import { render } from 'test/render';

import { ConfigPage } from './ConfigPage';

describe(`<ConfigPage /> uninitialised state`, () => {
  it(`renders the setup button`, async () => {
    render(<ConfigPage />);

    const setupButton = await screen.findByText(/Setup/i);
    expect(setupButton).toBeInTheDocument();
  });

  it(`renders the plugin version`, async () => {
    render(<ConfigPage />);

    const pluginVersion = await screen.findByText(`Plugin version: %VERSION%`);
    expect(pluginVersion).toBeInTheDocument();
  });
});

describe(`<ConfigPage /> initialised state`, () => {
  it(`renders the linked data sources`, async () => {
    render(<ConfigPage initialized />);
    const promName = await screen.findByText(MetricsDSSettings.name);

    expect(promName).toBeInTheDocument();
    expect(screen.getByText(LogsDSSettings.name)).toBeInTheDocument();
  });

  it(`renders the backend address`, async () => {
    render(<ConfigPage initialized />);

    const backendAddress = await screen.findByText(SMDSSettings.jsonData.apiHost);
    expect(backendAddress).toBeInTheDocument();
  });

  it(`renders access token generation and can generate a token`, async () => {
    const { user } = render(<ConfigPage initialized />);

    const accessTokenButton = await screen.findByText(/Generate access token/);
    expect(accessTokenButton).toBeInTheDocument();
    await user.click(accessTokenButton);

    const accessToken = await screen.findByText(CREATE_ACCESS_TOKEN);
    expect(accessToken).toBeInTheDocument();
  });

  it(`renders terraform config`, async () => {
    render(<ConfigPage initialized />);

    const terraformConfigButton = await screen.findByText(/Generate config/);
    expect(terraformConfigButton).toBeInTheDocument();
  });

  it(`renders disabling the plugin`, async () => {
    render(<ConfigPage initialized />);

    const disableButton = await screen.findByText(/Disable synthetic monitoring/i);
    expect(disableButton).toBeInTheDocument();
  });

  it(`renders the plugin version`, async () => {
    render(<ConfigPage initialized />);

    const pluginVersion = await screen.findByText(`Plugin version: %VERSION%`);
    expect(pluginVersion).toBeInTheDocument();
  });
});
