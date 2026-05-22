import type { TrainingNeed } from '@/types/trainingNeed';
import type { TrainingNeedRow } from '../schema.types';

export function mapTrainingNeedRowToTrainingNeed(row: TrainingNeedRow): TrainingNeed {
  return {
    id: row.id,
    schoolId: row.school_id,
    topic: row.topic,
    description: row.description,
    priority: row.priority,
    targetGroup: row.target_group,
    preferredFormat: row.preferred_format,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    status: row.status,
    createdBy: row.created_by ?? undefined,
  };
}
