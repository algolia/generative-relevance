import React from 'react';

import { Spinner } from '@inkjs/ui';
import { Box, Text } from 'ink';

export type AppStatus =
  | 'initializing'
  | 'noPerso'
  | 'apiKey'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'discarded';

type AppLabelProps = {
  appId: string;
  name: string;
  status?: AppStatus;
  selected: boolean;
};

export function AppLabel({ appId, name, status, selected }: AppLabelProps) {
  return (
    <Box
      paddingX={1}
      gap={1}
      width="100%"
      backgroundColor={selected ? 'gray' : undefined}
    >
      <AppStatusIcon status={status ?? 'initializing'} />
      <Text wrap="end">
        {appId} ({name})
      </Text>
    </Box>
  );
}

type AppStatusIconProps = {
  status: AppStatus;
};

export function AppStatusIcon({ status }: AppStatusIconProps) {
  const statusMap: Record<
    AppStatus,
    { color: string; symbol: string | React.JSX.Element }
  > = {
    initializing: { color: 'gray', symbol: '?' },
    noPerso: { color: 'gray', symbol: 'N' },
    apiKey: { color: 'yellow', symbol: 'K' },
    queued: { color: 'blue', symbol: 'Q' },
    running: { color: 'white', symbol: <Spinner /> },
    succeeded: { color: 'green', symbol: 'S' },
    failed: { color: 'redBright', symbol: 'F' },
    discarded: { color: 'black', symbol: 'D' },
  };

  const { color, symbol } = statusMap[status];
  return (
    <Box backgroundColor={color} paddingX={1}>
      {typeof symbol === 'string' ? <Text>{symbol}</Text> : symbol}
    </Box>
  );
}
