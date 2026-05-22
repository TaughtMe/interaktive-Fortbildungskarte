export type TrainingNeedFormat   = 'praesenz' | 'online' | 'schilf' | 'beratung';
export type TrainingNeedPriority = 'hoch' | 'mittel' | 'niedrig';

export const FORMAT_LABELS: Record<TrainingNeedFormat, string> = {
  praesenz:  'Präsenz',
  online:    'Online',
  schilf:    'Schilf',
  beratung:  'Beratung',
};

export const PRIORITY_LABELS: Record<TrainingNeedPriority, string> = {
  hoch:     'Hoch',
  mittel:   'Mittel',
  niedrig:  'Niedrig',
};

export interface TrainingNeed {
  id:              string;
  schoolId:        string;
  topic:           string;
  description:     string;
  priority:        TrainingNeedPriority;
  targetGroup:     string;
  preferredFormat: TrainingNeedFormat;
  createdAt:       string;
  updatedAt:       string;
}
