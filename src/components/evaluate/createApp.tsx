import { algoliasearch } from 'algoliasearch';
import { config } from 'dotenv';

import fs from 'node:fs';
import path from 'node:path';
import React, { useState } from 'react';

import { EvaluateOptions } from '@/cli/commands/evaluate';
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
  status?: AppStatus;
  evaluated?: boolean;
};

const algoliaClient = algoliasearch(
  process.env.APPS_APP_ID!,
  process.env.APPS_API_KEY!
);

export function createApp(
  entry: AppEntry,
  outputPath: string,
  options: EvaluateOptions
) {
  const [appState, setAppState] = useState(entry);
  const patchState = (newState: Partial<AppEntry>) =>
    setAppState((prevState) => ({ ...prevState, ...newState }));

  const outputFile = path.resolve(outputPath, `${entry.appId}.json`);
  const [logs, setLogs] = useState<string[]>([]);
  const updateLogs = (...lines: string[]) =>
    setLogs((prevLogs) => [...prevLogs, ...lines]);

  return {
    ...appState,
    outputFile,
    logs,
    discard() {
      patchState({ status: 'discarded' });
    },
    async init() {
      if (appState.status === 'succeeded' || appState.status === 'failed') {
        const previousLogs =
          JSON.parse(
            fs.readFileSync(outputFile, { encoding: 'utf-8', flag: 'a+' }) ||
              '{}'
          ).logs ?? [];
        setLogs(previousLogs);
        return;
      }

      const initLogs = [`Initializing app from entries…`];
      if (appState.status === 'running') {
        initLogs.push('- Resuming previous running state, setting to queued');
        patchState({ status: 'queued' });
      }

      if (typeof appState.persoId === 'undefined') {
        initLogs.push('- Fetching app info from Algolia');
        const info = await fetchAlgoliaAppInfo(algoliaClient, entry.appId);
        const canPerso = info.user_can_be_personified === true;

        initLogs.push(
          `- Personification ${canPerso ? 'available' : 'not available'}`
        );

        patchState({
          name: info.name
            ? `${info.name} / ${info.user_email}`
            : 'Untitled App',
          persoId: canPerso ? info.user_can_be_personified_id : 0,
          status: canPerso ? 'apiKey' : 'noPerso',
        });
      }

      setLogs(initLogs);
    },
    render: (selected: boolean) => (
      <AppLabel
        appId={appState.appId}
        name={appState.name!}
        status={appState.status}
        selected={selected}
      />
    ),
    retry() {
      setLogs([]);
      patchState({ status: 'queued' });
    },
    async run() {
      patchState({ status: 'running' });

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
          const fullLogs = [...prevLogs, `\n\n${reason ?? 'Done'}`];
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

        patchState({ status: reason ? 'failed' : 'succeeded' });
      };

      const appClient = algoliasearch(this.appId, this.adminApiKey!);
      const searchApiKey = await fetchAlgoliaSearchApiKey(appClient);

      const [targetIndex] = await selectIndices(appClient, updateLogs);
      if (!targetIndex) {
        return done({ reason: 'No target index could be found' });
      }

      const evaluation = await evaluateIndex(
        appClient,
        targetIndex,
        updateLogs
      );

      if (!evaluation.action) {
        return done({ evaluation });
      }

      try {
        const { model, limit, ...otherOptions } = options;
        const analysis = await analyze(
          {
            source: entry.appId,
            apiKey: searchApiKey,
            indexName: targetIndex,
            model,
            limit: parseInt(limit, 10),
            options: otherOptions,
          },
          updateLogs
        );

        done({ analysis, evaluation });
      } catch (e) {
        done({ reason: String(e), evaluation });
      }
    },
    export: () => appState,
    setAdminApiKey(adminApiKey: string) {
      setAppState((prevState) => ({ ...prevState, adminApiKey }));
      patchState({ status: 'queued' });
    },
  };
}
