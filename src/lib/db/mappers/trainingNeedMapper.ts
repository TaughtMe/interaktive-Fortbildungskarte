import type { TrainingNeed } from '@/types/trainingNeed';
import type { PgTrainingNeedSelect } from '../schema.pg';
import type { TrainingNeedRow } from '../schema.types';

type TrainingNeedRowLike = TrainingNeedRow | PgTrainingNeedSelect;

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function mapTrainingNeedRowToTrainingNeed(row: TrainingNeedRowLike): TrainingNeed {
  return {
    id: row.id,
    schoolId: row.school_id,
    topic: row.topic,
    description: row.description,
    priority: row.priority,
    targetGroup: row.target_group,
    preferredFormat: row.preferred_format,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    status: row.status,
    createdBy: row.created_by ?? undefined,
  };
}
