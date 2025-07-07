'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import useSWR from 'swr';
import useSWRMutation from 'swr/mutation';

import { TasksResponse, TaskWithStatus } from './api/tasks/route';

export default function Page() {
  const router = useRouter();
  const [indexName, setIndexName] = useState('');
  const [jsonInput, setJsonInput] = useState('');
  const [tasks, setTasks] = useState<TaskWithStatus[]>([]);

  const {
    trigger,
    isMutating,
    error: createIndexError,
  } = useSWRMutation('/api/indices', createIndex, {
    onSuccess: ({ tasks: responseTasks, indexName: responseIndexName }) => {
      if (responseTasks?.length > 0) {
        setTasks(responseTasks);
      } else {
        router.push(`/indices/${responseIndexName}`);
      }
    },
  });

  const shouldFetch = tasks.length > 0;

  const { data, error: taskError } = useSWR(
    shouldFetch ? ['/api/tasks', tasks] : null,
    ([url, tasks]) => fetchTasks(url, tasks),
    {
      refreshInterval: shouldFetch ? 2000 : 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      onSuccess: ({ allCompleted, anyFailed }) => {
        if (allCompleted) {
          router.push(`/indices/${indexName}`);
        } else if (anyFailed) {
          setTasks([]);
        }
      },
    }
  );

  const isProcessing = isMutating || shouldFetch;
  const isAnalyzing = isMutating && tasks.length === 0;
  const tasksWithStatus = data?.tasksWithStatus || [];
  const hasError = createIndexError || taskError || data?.anyFailed;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Create New Algolia Index</h1>

      <form
        onSubmit={async (event: React.FormEvent) => {
          event.preventDefault();

          try {
            const records = JSON.parse(jsonInput);

            await trigger({ indexName, records });
          } catch (err) {
            console.error('JSON parsing error:', err);
          }
        }}
        className="space-y-4"
      >
        <div>
          <label
            htmlFor="index-name"
            className="block text-sm font-medium mb-2"
          >
            Index Name
          </label>
          <input
            id="index-name"
            type="text"
            value={indexName}
            onChange={(e) => setIndexName(e.target.value)}
            placeholder="Enter index name..."
            className="w-full p-3 border border-gray-300 rounded-md"
            required
            disabled={isProcessing}
          />
        </div>

        <div>
          <label
            htmlFor="json-input"
            className="block text-sm font-medium mb-2"
          >
            Records JSON Data
          </label>
          <textarea
            id="json-input"
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="Enter JSON array of records for the index..."
            className="w-full h-64 p-3 border border-gray-300 rounded-md resize-vertical"
            required
            disabled={isProcessing}
          />
        </div>

        <button
          type="submit"
          disabled={isProcessing}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing ? 'Creating Index...' : 'Create Index'}
        </button>
      </form>

      {hasError && (
        <div className="mt-4 space-y-2">
          {createIndexError && (
            <div className="p-3 rounded-md bg-red-100 text-red-700">
              Error creating index: {createIndexError.message}
            </div>
          )}
          {taskError && (
            <div className="p-3 rounded-md bg-red-100 text-red-700">
              Error tracking tasks: {taskError.message}
            </div>
          )}
          {data?.anyFailed && (
            <div className="p-3 rounded-md bg-red-100 text-red-700">
              Some tasks failed. Please check the configuration.
            </div>
          )}
        </div>
      )}

      {(isAnalyzing || tasksWithStatus.length > 0) && (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm z-50">
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full mr-2 animate-pulse"></div>
            <h3 className="font-medium text-gray-900">
              {isAnalyzing ? 'Analyzing Records...' : 'Creating Index...'}
            </h3>
          </div>

          <div className="space-y-2">
            {isAnalyzing && (
              <div className="flex items-center text-sm">
                <div className="w-2 h-2 rounded-full mr-2 bg-blue-500 animate-pulse"></div>
                <span className="text-gray-700">
                  AI analyzing records for optimal configuration
                </span>
              </div>
            )}
            {tasksWithStatus.map((task, index) => (
              <TaskStatus key={`${task.taskID}-${index}`} task={task} />
            ))}
          </div>

          {tasksWithStatus.length > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              {data?.completedCount || 0} of{' '}
              {data?.totalCount || tasksWithStatus.length} tasks completed
            </div>
          )}
        </div>
      )}
    </div>
  );
}

async function fetchTasks(url: string, tasks: TaskWithStatus[]) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tasks }),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch task status');
  }

  return response.json() as Promise<TasksResponse>;
}

type CreateIndexParams = {
  indexName: string;
  records: Array<Record<string, unknown>>;
};

async function createIndex(url: string, { arg }: { arg: CreateIndexParams }) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const error = await response.text();

    throw new Error(error);
  }

  return response.json();
}

type TaskStatusProps = {
  task: TaskWithStatus;
};

function TaskStatus({ task }: TaskStatusProps) {
  return (
    <div className="flex items-center text-sm">
      <div
        className={`w-2 h-2 rounded-full mr-2 ${
          task.status === 'published'
            ? 'bg-green-500'
            : task.status === 'failed'
            ? 'bg-red-500'
            : 'bg-yellow-500 animate-pulse'
        }`}
      ></div>
      <span
        className={
          task.status === 'published'
            ? 'text-green-700 line-through'
            : task.status === 'failed'
            ? 'text-red-700'
            : 'text-gray-700'
        }
      >
        {task.description}
      </span>
    </div>
  );
}
