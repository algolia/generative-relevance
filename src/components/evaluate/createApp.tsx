import { algoliasearch } from 'algoliasearch';
import { config } from 'dotenv';
import { type Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import React, { useState } from 'react';
import stripAnsi from 'strip-ansi';

import { getAlgoliaAppInfo } from '../../cli/utils/algolia';
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

  const [persoId, setPersoId] = useState<number>();
  const [status, setStatus] = useState<
    'pending' | 'apiKey' | 'running' | 'evaluated' | 'queued'
  >(initialStatus);

  if (typeof appState.personifiable === 'undefined') {
    getAlgoliaAppInfo(algoliaClient, entry.appId).then((info) => {
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

      // TODO:
      // - Determine target index
      // - Evaluate opportunity

      const searchApiKey = (await appClient.listApiKeys()).keys.find(
        (key) =>
          key.acl.length === 1 &&
          key.acl[0] === 'search' &&
          !key.indexes &&
          !key.referers &&
          key.description === 'Search-only API Key'
      );

      const subProcess = spawn(
        'npm',
        `start -- analyze ${entry.appId} --api-key ${searchApiKey?.value} --index products --model gpt-5 --limit 10 --verbose`.split(
          ' '
        ),
        { stdio: ['pipe', 'pipe', 'pipe'] }
      );

      subProcess.stdout.on('data', (data: Buffer) => {
        const lines = stripAnsi(data.toString('utf-8'));
        setLogs((prevLogs) => [...prevLogs, ...lines.split('\n')]);
      });
      subProcess.stderr.on('data', (data: Buffer) => {
        const lines = stripAnsi(data.toString('utf-8'));
        setLogs((prevLogs) => [...prevLogs, ...lines.split('\n')]);
      });

      subProcess.on('close', () => {
        // FIXME: Hack to get proper logs in subprocess context
        setLogs((prevLogs) => {
          fs.writeFileSync(logPath, prevLogs.join('\n'), {
            flag: 'w',
            encoding: 'utf-8',
          });
          return prevLogs;
        });
        setAppState((prevState) => ({ ...prevState, evaluated: true }));
        setStatus('evaluated');
      });
    },
    export: () => appState,
    setAdminApiKey(adminApiKey: string) {
      setAppState((prevState) => ({ ...prevState, adminApiKey }));
      setStatus('queued');
    },
  };
}
