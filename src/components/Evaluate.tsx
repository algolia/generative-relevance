import { PasswordInput } from '@inkjs/ui';
import { Box, Text, useApp, useInput, useStdout } from 'ink';
import { readFileSync, writeFileSync } from 'node:fs';
import open from 'open';
import React, { useEffect, useState } from 'react';

import type { EvaluateOptions } from '../cli/commands/evaluate';
import { type AppEntry, createApp } from './evaluate/createApp';

type EvaluateProps = {
  entriesPath: string;
  outputPath: string;
  options: EvaluateOptions;
};

const RUNNING_APPS_MAX_COUNT = 2;
let initialized = false;

export function Evaluate({ entriesPath, outputPath, options }: EvaluateProps) {
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
  const [showSaved, setShowSaved] = useState(false);

  const apps = entries.map((entry) => createApp(entry, outputPath, options));

  const availableLines = (stdout.rows || 24) - 12;
  const boxHeight = Math.floor(availableLines / 2);
  const boxLines = boxHeight - 6;

  const save = () => {
    const updatedEntries = apps.map((app) => app.export());
    saveEntries(updatedEntries, entriesPath);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  // Auto-save
  useEffect(() => {
    const intervalId = setInterval(save, 5000);
    return () => clearInterval(intervalId);
  }, [apps]);

  const currentPersoLink = `https://dashboard.algolia.com/account/api-keys/all?applicationId=${apps[activeIndex].appId}&_pid=${apps[activeIndex].persoId}`;
  useEffect(() => {
    if (showApiKeyModal) {
      open(currentPersoLink);
    }
  }, [showApiKeyModal]);

  // Handle keyboard input
  useInput((input, key) => {
    if (!showApiKeyModal) {
      // Apps navigation
      if (key.upArrow) {
        setActiveIndex(
          activeIndex - 1 >= 0 ? activeIndex - 1 : apps.length - 1
        );
      }
      if (key.downArrow) {
        setActiveIndex(activeIndex + 1 < apps.length ? activeIndex + 1 : 0);
      }
      if (key.leftArrow) {
        const prevIndex = (Math.floor(activeIndex / boxLines) - 1) * boxLines;
        setActiveIndex(
          prevIndex >= 0
            ? prevIndex
            : Math.floor(apps.length / boxLines) * boxLines
        );
      }
      if (key.rightArrow) {
        const nextIndex = (Math.floor(activeIndex / boxLines) + 1) * boxLines;
        setActiveIndex(nextIndex < apps.length ? nextIndex : 0);
      }

      // Show Api Key Modal
      if (key.return && apps[activeIndex].status === 'apiKey') {
        setShowApiKeyModal(true);
      }

      // Re-run evaluation
      if (
        key.ctrl &&
        input === 'r' &&
        (apps[activeIndex].status === 'succeeded' ||
          apps[activeIndex].status === 'failed')
      ) {
        apps[activeIndex].retry();
      }

      // Discard
      if (key.ctrl && input === 'd' && apps[activeIndex].status === 'apiKey') {
        apps[activeIndex].discard();
      }

      // Save
      if (key.ctrl && input === 's') {
        save();
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

  if (!initialized) {
    apps.forEach((app) => app.init());
    initialized = true;
  }

  const runningApps = apps.filter(({ status }) => status === 'running');
  const runnableApps = apps
    .filter(({ status }) => status === 'queued')
    .slice(0, RUNNING_APPS_MAX_COUNT - runningApps.length);
  runnableApps.forEach((app) => app.run());

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
        <Box justifyContent="space-between">
          <Text color="green" bold>
            Generative Relevance Evaluator
          </Text>
          {showSaved && <Text color="green">Entries saved 💾</Text>}
        </Box>
        <Text dimColor>
          Use ↑/↓/←/→ arrows to navigate • Ctrl+S to save entries • Esc to quit
        </Text>
      </Box>
      {/* Applications */}
      <Box
        borderStyle="round"
        borderColor="cyan"
        paddingX={2}
        paddingY={1}
        height={boxHeight}
        flexDirection="column"
      >
        <Box gap={1}>
          <Text color="cyan" bold>
            Applications
          </Text>
          <Text color="cyan">
            ({activeIndex + 1} / {apps.length})
          </Text>
        </Box>
        <Box flexDirection="column" marginTop={1}>
          {apps
            // .sort((a, b) => Number(!!a.evaluated) - Number(!!b.evaluated))
            .slice(
              Math.floor(activeIndex / boxLines) * boxLines,
              Math.floor(activeIndex / boxLines) * boxLines + boxLines
            )
            .map((app, index) => (
              <Box key={app.appId}>
                {app.render(index === activeIndex % boxLines)}
              </Box>
            ))}
        </Box>
      </Box>
      <Box paddingY={1} alignItems="center" justifyContent="space-around">
        <Box gap={1}>
          <Text color="green">
            <Text bold underline>
              S
            </Text>
            ucceeded
          </Text>
          <Text dimColor>
            {apps.filter(({ status }) => status === 'succeeded').length}
          </Text>
        </Box>
        <Box gap={1}>
          <Text color="white">Running</Text>
          <Text dimColor>
            {apps.filter(({ status }) => status === 'running').length}
          </Text>
        </Box>
        <Box gap={1}>
          <Text color="blue">
            <Text bold underline>
              Q
            </Text>
            ueued
          </Text>
          <Text dimColor>
            {apps.filter(({ status }) => status === 'queued').length}
          </Text>
        </Box>
        <Box gap={1}>
          <Text color="yellow">
            <Text bold underline>
              K
            </Text>
            ey required
          </Text>
          <Text dimColor>
            {apps.filter(({ status }) => status === 'apiKey').length}
          </Text>
        </Box>
        <Box gap={1}>
          <Text color="redBright">
            <Text bold underline>
              F
            </Text>
            ailed
          </Text>
          <Text dimColor>
            {apps.filter(({ status }) => status === 'failed').length}
          </Text>
        </Box>
        <Box gap={1}>
          <Text color="gray">
            <Text bold underline>
              N
            </Text>
            on-personifiable
          </Text>
          <Text dimColor>
            {apps.filter(({ status }) => status === 'noPerso').length}
          </Text>
        </Box>
        <Box gap={1}>
          <Text color="black">
            <Text bold underline>
              D
            </Text>
            iscarded
          </Text>
          <Text dimColor>
            {apps.filter(({ status }) => status === 'discarded').length}
          </Text>
        </Box>
      </Box>
      {/* Logs */}
      <Box
        borderStyle="round"
        borderColor="white"
        paddingX={2}
        paddingY={1}
        height={boxHeight}
        flexDirection="column"
      >
        <Text color="white" bold>
          Evaluation Logs
        </Text>
        <Box marginTop={1} flexDirection="column">
          {apps[activeIndex].logs.slice(boxLines * -1).map((logLine, index) => (
            <Text key={index} color="gray" wrap="truncate-end">
              {logLine.length > 0 ? logLine : ' '}
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
          width="100%"
          marginTop={Math.floor((availableLines - 4) / 2)}
        >
          <Text>
            Enter Admin API Key for <Text bold>{apps[activeIndex].appId}</Text>:
          </Text>
          <Text dimColor>{currentPersoLink}</Text>
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

function readEntries(path: string): { entries: AppEntry[]; error?: unknown } {
  try {
    return { entries: JSON.parse(readFileSync(path, 'utf-8')) };
  } catch (error) {
    return { entries: [], error };
  }
}

function saveEntries(entries: AppEntry[], path: string) {
  writeFileSync(path, JSON.stringify(entries, null, 2), { encoding: 'utf-8' });
}
