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
    const { tasks }: { tasks: Task[] } = await request.json();

    const appId = process.env.ALGOLIA_APP_ID;
    const adminApiKey = process.env.ALGOLIA_ADMIN_API_KEY;

    if (!appId || !adminApiKey) {
      return NextResponse.json(
        { error: 'Missing Algolia credentials in environment variables' },
        { status: 500 }
      );
    }

    const client = algoliasearch(appId, adminApiKey);

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
