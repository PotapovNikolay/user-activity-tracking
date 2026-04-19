export interface ActivityDeadLetterPayload {
  queueName: string;
  jobName: string;
  originalJobId: string;
  reason: string;
  payload: unknown;
  failedAt: string;
}
