export type TrainingNeedFormat   = 'praesenz' | 'online' | 'schilf' | 'beratung';
export type TrainingNeedPriority = 'hoch' | 'mittel' | 'niedrig';
// Status lifecycle: open → acknowledged → fulfilled | closed
// TODO (DB): stored in training_needs.status; default 'open'
export type TrainingNeedStatus   = 'open' | 'acknowledged' | 'fulfilled' | 'closed';

export const STATUS_LABELS: Record<TrainingNeedStatus, string> = {
  open:         'Offen',
  acknowledged: 'Zur Kenntnis genommen',
  fulfilled:    'Erfüllt',
  closed:       'Geschlossen',
};

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
  // Optional fields are absent in demo data, but required or nullable in DB rows.
  status?:         TrainingNeedStatus;  // TODO (DB): non-optional in DB, default 'open'
  createdBy?:      string;              // TODO (DB): FK -> users.id, NULL until auth exists
}
