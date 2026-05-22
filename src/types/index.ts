import type { TrainingNeed } from './trainingNeed';

export type SchoolTypKey = 'G' | 'M' | 'GM';
export type MarkerStyle  = 'pin' | 'dot' | 'icon';
export type Theme        = 'light' | 'dark';
export type Prio         = 'hoch' | 'mittel' | 'niedrig';

export type { TrainingNeed, TrainingNeedFormat, TrainingNeedPriority, TrainingNeedStatus } from './trainingNeed';

export interface SchoolType {
  key:   SchoolTypKey;
  label: string;
  short: string;
  color: string;
}

export interface School {
  id:      string;
  name:    string;
  ort:     string;
  typ:     SchoolTypKey;
  lat:     number;
  lng:     number;
  adresse: string;
  tel:     string;
  fax:     string;
  mail:    string;
  web:     string;
  leitung: string;
}

export interface LaufendeFortbildung {
  titel:       string;
  teilnehmer:  number;
  ende:        string;
}

export interface SchoolFortbildungen {
  laufend: LaufendeFortbildung[];
  bedarf:  TrainingNeed[];
}

export interface PopupOrigin {
  x: number;
  y: number;
}

export interface DetailState {
  school: School;
  origin: PopupOrigin | null;
}
