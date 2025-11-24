import React, { useState } from 'react';
import { algoliasearch } from 'algoliasearch';
import { config } from 'dotenv';

import { AppLabel, AppStatus } from './AppLabel';
import { getAlgoliaAppInfo } from '../../cli/utils/algolia';

config();

export type AppEntry = {
  appId: string;
  adminApiKey?: string;
  name?: string;
  personifiable?: boolean;
  evaluated?: boolean;
};

const algoliaClient = algoliasearch(
  process.env.APPS_APP_ID!,
  process.env.APPS_API_KEY!
);

const appLogs: Record<string, string[]> = {};

export function createApp(entry: AppEntry) {
  if (!appLogs[entry.appId]) {
    appLogs[entry.appId] = [
      `App ${entry.appId} initialized from entry:`,
      JSON.stringify(entry),
    ];
  }
  const logs = appLogs[entry.appId];

  const [appState, setAppState] = useState(entry);

  let initialStatus: AppStatus;
  switch (true) {
    case appState.evaluated:
      initialStatus = 'evaluated';
      break;
    case appState.evaluated === false || appState.personifiable === false:
      initialStatus = 'evaluated';
      break;
    case appState.personifiable && !appState.adminApiKey:
      initialStatus = 'apiKey';
      break;
    case appState.personifiable && !!appState.adminApiKey:
      initialStatus = 'running';
      break;
    default:
      initialStatus = 'pending';
      break;
  }

  const [persoId, setPersoId] = useState<number>();
  const [status, setStatus] = useState<
    'pending' | 'apiKey' | 'running' | 'evaluated' | 'queued'
  >(initialStatus);

  if (typeof appState.personifiable === 'undefined') {
    logs.push(`Fetching app info for ${entry.appId}...`);
    getAlgoliaAppInfo(algoliaClient, entry.appId).then((info) => {
      if (!info?.user_can_be_personified) {
        logs.push(`App cannot be personified. Marking as evaluated.`);
        setAppState((prevState) => ({
          ...prevState,
          name: info.name ?? 'Untitled App',
          personifiable: false,
          evaluated: true,
        }));
        setStatus('evaluated');
      } else {
        logs.push(`App can be personified. Requesting Admin API Key.`);
        setAppState((prevState) => ({
          ...prevState,
          name: info.name ?? 'Untitled App',
          personifiable: true,
        }));
        setStatus('apiKey');
        setPersoId(info.user_can_be_personified_id);
      }
    });
  }

  return {
    ...appState,
    logs,
    persoId,
    status,
    render: (selected: boolean) => (
      <AppLabel
        appId={appState.appId}
        name={appState.name!}
        status={status}
        selected={selected}
      />
    ),
    run() {
      // TODO: Implement
      logs.push('Running evaluation...');
      setStatus('running');

      setTimeout(() => {
        setStatus('evaluated');
        setAppState((prevState) => ({
          ...prevState,
          evaluated: true,
        }));
      }, 2000);
    },
    export: () => appState,
    setAdminApiKey(adminApiKey: string) {
      setAppState((prevState) => ({ ...prevState, adminApiKey }));
      setStatus('queued');
    },
  };
}
