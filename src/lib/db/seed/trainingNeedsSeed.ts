import { FORTBILDUNGEN_DEFAULT, SCHULEN } from '@/data/schools';
import type { TrainingNeedInsert } from '../schema';

const SEED_TIMESTAMP = '2026-05-01T00:00:00.000Z';

export const trainingNeedsSeed: TrainingNeedInsert[] = SCHULEN.flatMap((school, schoolIndex) => {
  if (schoolIndex % 3 !== 0) {
    return [];
  }

  return FORTBILDUNGEN_DEFAULT.bedarf.map((need, needIndex) => ({
    id: `${school.id}-need-${needIndex + 1}`,
    school_id: school.id,
    created_by: null,
    topic: need.topic,
    description: need.description,
    priority: need.priority,
    target_group: need.targetGroup,
    preferred_format: need.preferredFormat,
    status: need.status ?? 'open',
    created_at: SEED_TIMESTAMP,
    updated_at: SEED_TIMESTAMP,
  }));
});
