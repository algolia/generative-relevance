import { algoliasearch } from 'algoliasearch';
import { NextRequest, NextResponse } from 'next/server';

export type Task = {
  taskID: number;
  indexName: string;
  description: string;
};

export type TaskWithStatus = Task & { status?: string };

export type TasksResponse = {
  tasksWithStatus: TaskWithStatus[];
  allCompleted: boolean;
  anyFailed: boolean;
  completedCount: number;
  totalCount: number;
};

export async function POST(request: NextRequest) {
  try {
    const { tasks, appId, writeApiKey }: { tasks: Task[], appId: string, writeApiKey: string } = await request.json();

    if (!appId || !writeApiKey) {
      return NextResponse.json(
        { error: 'Missing Algolia credentials in request body' },
        { status: 400 }
      );
    }

    const client = algoliasearch(appId, writeApiKey);

    const tasksWithStatus = await Promise.all(
      tasks.map(async (task) => {
        try {
          const { status } = await client.getTask({
            indexName: task.indexName,
            taskID: task.taskID,
          });

          return { ...task, status };
        } catch (err) {
          console.error(`Failed to get task status for ${task.taskID}:`, err);

          return { ...task, status: 'unknown' };
        }
      })
    );

    const allCompleted = tasksWithStatus.every(
      ({ status }) => status === 'published'
    );
    const anyFailed = tasksWithStatus.some(({ status }) => status === 'failed');
    const completedCount = tasksWithStatus.filter(
      ({ status }) => status === 'published'
    ).length;

    return NextResponse.json<TasksResponse>({
      tasksWithStatus,
      allCompleted,
      anyFailed,
      completedCount,
      totalCount: tasksWithStatus.length,
    });
  } catch (err) {
    console.error('Failed to check task status:', err);

    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : 'Failed to check task status',
      },
      { status: 500 }
    );
  }
}
