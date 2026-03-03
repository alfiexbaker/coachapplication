import type { PracticeTask } from '@/services/progress/progress-practice-task-service';
import type { Result, ServiceError } from '@/types/result';

export type ResultsProgramTaskAction =
  | {
      type: 'toggle_completion';
      task: PracticeTask;
      completionNote?: string;
    }
  | {
      type: 'reschedule';
      task: PracticeTask;
      dueAtIso: string;
    }
  | {
      type: 'snooze';
      task: PracticeTask;
      hours: number;
    };

export interface ResultsProgramTaskMutationDrivers {
  setTaskCompletion: (
    taskId: string,
    completed: boolean,
    completionNote?: string,
  ) => Promise<Result<PracticeTask, ServiceError>>;
  updateTaskDueAt: (taskId: string, dueAtIso: string) => Promise<Result<PracticeTask, ServiceError>>;
  snoozeTask: (taskId: string, hours: number) => Promise<Result<PracticeTask, ServiceError>>;
}

export async function runResultsProgramTaskAction(
  action: ResultsProgramTaskAction,
  drivers: ResultsProgramTaskMutationDrivers,
): Promise<Result<PracticeTask, ServiceError>> {
  if (action.type === 'toggle_completion') {
    const nextCompleted = action.task.status !== 'completed';
    return drivers.setTaskCompletion(action.task.id, nextCompleted, action.completionNote);
  }

  if (action.type === 'reschedule') {
    return drivers.updateTaskDueAt(action.task.id, action.dueAtIso);
  }

  return drivers.snoozeTask(action.task.id, action.hours);
}
