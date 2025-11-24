import React from 'react';

import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';

export type AppStatus =
  | 'pending'
  | 'apiKey'
  | 'queued'
  | 'running'
  | 'evaluated';

type AppLabelProps = {
  appId: string;
  name: string;
  status: AppStatus;
  selected: boolean;
};

export function AppLabel({ appId, name, status, selected }: AppLabelProps) {
  return (
    <Box gap={1}>
      <Text color={selected ? 'cyan' : 'gray'} bold={selected}>
        {selected ? '•' : ' '}
      </Text>
      <AppStatusIcon status={status} />
      <Text wrap="end" color={selected ? 'cyan' : 'gray'} bold={selected}>
        {appId} ({name})
      </Text>
    </Box>
  );
}

type AppStatusIconProps = {
  status: AppStatus;
};

function AppStatusIcon({ status }: AppStatusIconProps) {
  const statusMap: Record<AppStatus, string | React.JSX.Element> = {
    pending: '🌐',
    apiKey: '🔑',
    evaluated: '✅',
    queued: '⏳',
    running: <Spinner type="clock" />,
  };

  const icon = statusMap[status];
  return typeof icon === 'string' ? (
    <Text>{icon}</Text>
  ) : (
    <Box marginRight={-1}>{icon}</Box>
  );
}
