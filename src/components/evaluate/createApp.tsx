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
import { evaluateIndex } from '@/features/evaluate-index';
import { selectIndices } from '@/features/select-indices';
import { AppLabel, AppStatus } from './AppLabel';

config();

export type AppEntry = {
  appId: string;
  adminApiKey?: string;
  name?: string;
  persoId?: number;
  evaluated?: boolean;
};

const algoliaClient = algoliasearch(
  process.env.APPS_APP_ID!,
  process.env.APPS_API_KEY!
);

export function createApp(entry: AppEntry, outputPath: string) {
  const [appState, setAppState] = useState(entry);

  let initialStatus: AppStatus;
  switch (true) {
    case appState.evaluated:
      initialStatus = 'evaluated';
      break;
    case appState.evaluated === false || !appState.persoId:
      initialStatus = 'evaluated';
      break;
    case !!appState.persoId && !appState.adminApiKey:
      initialStatus = 'apiKey';
      break;
    case appState.persoId && !!appState.adminApiKey:
      initialStatus = 'queued';
      break;
    default:
      initialStatus = 'pending';
      break;
  }

  const outputFile = path.resolve(outputPath, `${entry.appId}.json`);
  const initialLogs =
    JSON.parse(
      fs.readFileSync(outputFile, { encoding: 'utf-8', flag: 'a+' }) || '{}'
    ).logs ?? [];
  const [logs, setLogs] = useState<string[]>(
    initialStatus === 'evaluated' ? initialLogs : []
  );
  const updateLogs = (...lines: string[]) =>
    setLogs((prevLogs) => [...prevLogs, ...lines]);

  const [status, setStatus] = useState<
    'pending' | 'apiKey' | 'running' | 'evaluated' | 'queued'
  >(initialStatus);

  if (typeof appState.persoId === 'undefined') {
    fetchAlgoliaAppInfo(algoliaClient, entry.appId).then((info) => {
      if (!info?.user_can_be_personified) {
        setAppState((prevState) => ({
          ...prevState,
          name: info.name
            ? `${info.name} / ${info.user_email}`
            : 'Untitled App',
          persoId: 0,
          evaluated: true,
        }));
        setStatus('evaluated');
      } else {
        setAppState((prevState) => ({
          ...prevState,
          name: info.name
            ? `${info.name} / ${info.user_email}`
            : 'Untitled App',
          persoId: info.user_can_be_personified_id,
        }));
        setStatus('apiKey');
      }
    });
  }

  return {
    ...appState,
    logs,
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

      const done = (
        {
          analysis,
          reason,
          evaluation,
        }: {
          analysis?: any;
          reason?: string;
          evaluation?: any;
        } = { analysis: {} }
      ) => {
        // FIXME: Hack to get up-to-date logs within the run context
        setLogs((prevLogs) => {
          const fullLogs = [...prevLogs, `- ${reason ?? 'Done'}`];
          fs.writeFileSync(
            outputFile,
            JSON.stringify(
              {
                info: {
                  ...appState,
                  adminApiKey: '*'.repeat(32),
                  searchApiKey,
                },
                evaluation,
                analysis,
                logs: fullLogs,
              },
              null,
              2
            ),
            { flag: 'w', encoding: 'utf-8' }
          );

          return fullLogs;
        });

        setAppState((prevState) => ({ ...prevState, evaluated: true }));
        setStatus('evaluated');
      };

      const appClient = algoliasearch(this.appId, this.adminApiKey!);
      const searchApiKey = await fetchAlgoliaSearchApiKey(appClient);

      const [targetIndex] = await selectIndices(appClient, updateLogs);
      if (!targetIndex) {
        return done();
      }

      const evaluation = await evaluateIndex(
        appClient,
        targetIndex,
        updateLogs
      );

      if (!evaluation.action) {
        return done({ evaluation });
      }

      updateLogs(`\nRunning analysis on ${targetIndex}…`);
      // TODO: Forward command line arguments
      try {
        const analysis = await analyze({
          source: entry.appId,
          apiKey: searchApiKey,
          indexName: targetIndex,
          model: 'gpt-5',
          limit: 10,
          options: {},
        });

        done({ analysis, evaluation });
      } catch (e) {
        done({ reason: String(e), evaluation });
      }
    },
    export: () => appState,
    setAdminApiKey(adminApiKey: string) {
      setAppState((prevState) => ({ ...prevState, adminApiKey }));
      setStatus('queued');
    },
  };
}
