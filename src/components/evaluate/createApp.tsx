import { algoliasearch } from 'algoliasearch';
import { config } from 'dotenv';

import fs from 'node:fs';
import path from 'node:path';
import React, { useState } from 'react';

import {
  fetchAlgoliaAppInfo,
  fetchAlgoliaSearchApiKey,
} from '@/cli/utils/algolia';
import { analyze } from '@/features/analyze';
import { selectIndices } from '@/features/select-indices';
import { AppLabel, AppStatus } from './AppLabel';

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

export function createApp(entry: AppEntry, logsPath: string) {
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
      initialStatus = 'queued';
      break;
    default:
      initialStatus = 'pending';
      break;
  }

  const logPath = path.resolve(logsPath, `${entry.appId}.log`);
  const [logs, setLogs] = useState<string[]>(
    initialStatus === 'evaluated'
      ? fs.readFileSync(logPath, 'utf-8').split('\n')
      : []
  );
  const updateLogs = (...lines: string[]) =>
    setLogs((prevLogs) => [...prevLogs, ...lines]);

  const [persoId, setPersoId] = useState<number>();
  const [status, setStatus] = useState<
    'pending' | 'apiKey' | 'running' | 'evaluated' | 'queued'
  >(initialStatus);

  if (typeof appState.personifiable === 'undefined') {
    fetchAlgoliaAppInfo(algoliaClient, entry.appId).then((info) => {
      if (!info?.user_can_be_personified) {
        setAppState((prevState) => ({
          ...prevState,
          name: info.name
            ? `${info.name} / ${info.user_email}`
            : 'Untitled App',
          personifiable: false,
          evaluated: true,
        }));
        setStatus('evaluated');
      } else {
        setAppState((prevState) => ({
          ...prevState,
          name: info.name
            ? `${info.name} / ${info.user_email}`
            : 'Untitled App',
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
    async run() {
      setStatus('running');

      const appClient = algoliasearch(this.appId, this.adminApiKey!);
      const searchApiKey = await fetchAlgoliaSearchApiKey(appClient);

      const [targetIndex] = await selectIndices(appClient, updateLogs);

      updateLogs(`\nRunning analysis on ${targetIndex}…`);
      const analysis = await analyze({
        source: entry.appId,
        apiKey: searchApiKey,
        indexName: targetIndex,
        model: 'gpt-5',
        limit: 10,
        options: {},
      });
      updateLogs(`- Done`);

      // FIXME: Hack to get up-to-date logs within the run context
      setLogs((prevLogs) => {
        fs.writeFileSync(
          logPath,
          JSON.stringify({ analysis, logs: prevLogs }, null, 2),
          { flag: 'w', encoding: 'utf-8' }
        );

        return prevLogs;
      });

      setAppState((prevState) => ({ ...prevState, evaluated: true }));
      setStatus('evaluated');
    },
    export: () => appState,
    setAdminApiKey(adminApiKey: string) {
      setAppState((prevState) => ({ ...prevState, adminApiKey }));
      setStatus('queued');
    },
  };
}
