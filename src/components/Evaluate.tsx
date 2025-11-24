import React, { useState } from 'react';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { readFileSync, writeFileSync } from 'node:fs';
import { algoliasearch } from 'algoliasearch';
import { config } from 'dotenv';
import { PasswordInput, Spinner } from '@inkjs/ui';

config();

type Entry = {
  appId: string;
  adminApiKey?: string;
  name?: string;
  personifiable?: boolean;
  evaluated?: boolean;
};

type EvaluateProps = {
  entriesPath: string;
};

const algoliaClient = algoliasearch(
  process.env.APPS_APP_ID!,
  process.env.APPS_API_KEY!
);

export function Evaluate({ entriesPath }: EvaluateProps) {
  const { exit } = useApp();
  const { stdout } = useStdout();

  const { entries, error } = readEntries(entriesPath);
  if (error) {
    return (
      <Box
        borderStyle="bold"
        borderColor="red"
        flexDirection="column"
        padding={1}
        alignItems="center"
        gap={1}
      >
        <Text color="red" bold>
          An error occurred
        </Text>
        <Text>{String(error)}</Text>
      </Box>
    );
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const apps = entries.map((entry) => createApp(entry));

  const availableLines = (stdout.rows || 24) - 12;
  const boxHeight = Math.floor(availableLines / 2);

  useInput((input, key) => {
    if (!showApiKeyModal) {
      // Apps navigation
      if (key.upArrow) {
        setActiveIndex((index) => Math.max(0, index - 1));
      }
      if (key.downArrow) {
        setActiveIndex((index) => Math.min(apps.length - 1, index + 1));
      }

      // Show Api Key Modal
      if (key.return && apps[activeIndex].status === 'apiKey') {
        setShowApiKeyModal(true);
      }

      // Save
      if (key.ctrl && input === 's') {
        const updatedEntries = apps.map((app) => app.export());
        // TODO: Flash "Saved" status somewhere
        saveEntries(updatedEntries, entriesPath);
      }

      // Exit
      if (key.escape) {
        return exit();
      }
    }

    if (showApiKeyModal) {
      if (key.escape) {
        setShowApiKeyModal(false);
      }
    }
  });

  return (
    <Box flexDirection="column" height="100%">
      {/* Header */}
      <Box
        borderStyle="round"
        borderColor="green"
        paddingX={2}
        paddingY={1}
        flexDirection="column"
      >
        <Text color="green" bold>
          Generative Relevance Evaluator
        </Text>
        <Text dimColor>
          Use ↑/↓ arrows to navigate • Ctrl+S to save entries • Esc to quit
        </Text>
      </Box>
      {/* Applications */}
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        marginTop={1}
        height={boxHeight}
        flexDirection="column"
      >
        <Text color="cyan" bold>
          Applications
        </Text>
        <Box flexDirection="column" marginTop={1}>
          {/* TODO: Slice + Add left/right pagination */}
          {apps.map((app, index) => (
            <Box key={app.appId}>{app.render(index === activeIndex)}</Box>
          ))}
        </Box>
      </Box>
      {/* Logs */}
      <Box
        borderStyle="round"
        borderColor="yellow"
        paddingX={2}
        paddingY={1}
        marginTop={1}
        height={boxHeight}
        flexDirection="column"
      >
        <Text color="yellow" bold>
          Live logs
        </Text>
        <Box marginTop={1} flexDirection="column">
          {apps[activeIndex].logs.map((logLine, index) => (
            <Text key={index} color="gray" wrap="truncate-end">
              {logLine}
            </Text>
          ))}
        </Box>
      </Box>
      {showApiKeyModal && (
        <Box
          position="absolute"
          backgroundColor="white"
          flexDirection="column"
          paddingX={3}
          paddingY={1}
          marginLeft={Math.floor((stdout.columns - 40) / 2)}
          marginTop={Math.floor((availableLines - 4) / 2)}
        >
          <Text>
            Enter Admin API Key for <Text bold>{apps[activeIndex].appId}</Text>:
          </Text>
          <PasswordInput
            onSubmit={(value) => {
              apps[activeIndex].setAdminApiKey(value);
              setShowApiKeyModal(false);
            }}
          />
        </Box>
      )}
    </Box>
  );
}

function readEntries(path: string): { entries: Entry[]; error?: unknown } {
  try {
    return { entries: JSON.parse(readFileSync(path, 'utf-8')) };
  } catch (error) {
    return { entries: [], error };
  }
}

function saveEntries(entries: Entry[], path: string) {
  writeFileSync(path, JSON.stringify(entries, null, 2), { encoding: 'utf-8' });
}

function createApp(entry: Entry) {
  const logs: string[] = [];

  const [appState, setAppState] = useState(entry);
  const [status, setStatus] = useState<
    'pending' | 'apiKey' | 'running' | 'evaluated'
  >(
    appState.evaluated
      ? 'evaluated'
      : appState.personifiable && !appState.adminApiKey
      ? 'apiKey'
      : 'pending'
  );

  logs.push(`App ${entry.appId} initialized to ${status} from entry:`);
  logs.push(JSON.stringify(entry));

  if (typeof appState.personifiable === 'undefined') {
    logs.push(`Fetching app info for ${entry.appId}...`);
    getAppInfo(entry.appId).then((info) => {
      if (!info) {
        logs.push(`App cannot be personified. Marking as evaluated.`);
        setAppState((prevState) => ({
          ...prevState,
          personifiable: false,
          evaluated: true,
        }));
        setStatus('evaluated');
      } else {
        logs.push(`App can be personified. Requesting Admin API Key.`);
        setAppState((prevState) => ({
          ...prevState,
          name: info.name ?? 'Untitled App',
          personifiable: info.user_can_be_personified,
        }));
        // TODO: Save Perso ID to display help
        setStatus('apiKey');
      }
    });
  }

  return {
    ...appState,
    logs,
    status,
    render(selected?: boolean) {
      return (
        <Box gap={1}>
          <Text color={selected ? 'cyan' : 'gray'} bold={selected}>
            {selected ? '•' : ' '}
          </Text>
          <StatusIcon status={status} />
          <Text color={selected ? 'cyan' : 'gray'} bold={selected}>
            {this.appId} ({this.name})
          </Text>
        </Box>
      );
    },
    run() {
      // TODO: Implement
      setStatus('running');
      console.log('running evaluation');
    },
    export: () => appState,
    setAdminApiKey(adminApiKey: string) {
      setAppState((prevState) => ({ ...prevState, adminApiKey }));
      setStatus('pending');
    },
  };
}

function StatusIcon({
  status,
}: {
  status: 'pending' | 'apiKey' | 'running' | 'evaluated';
}) {
  const statusMap = {
    pending: '⏳',
    apiKey: '🔑',
    evaluated: '✅',
  };

  if (status === 'running') {
    return <Spinner type="clock" />;
  }

  return <Text>{statusMap[status]} </Text>;
}

// TODO: Put in utils
async function getAppInfo(appId: string) {
  const { results } = await algoliaClient.searchForHits<{
    name?: string;
    user_can_be_personified: boolean;
    user_can_be_personified_id: number;
  }>({
    requests: [
      {
        indexName: 'applications_production',
        facetFilters: [`application_id:${appId}`],
      },
    ],
  });

  const hit = results[0].hits[0];

  if (!hit?.user_can_be_personified) {
    return undefined;
  }

  return hit;
}
