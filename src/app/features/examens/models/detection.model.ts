export type DetectionType = 'BOX' | 'MASQUE';
export type DetectionStatut = 'EN_ATTENTE' | 'ACCEPTEE' | 'REJETEE';
export type AnalyseStatut = 'EN_ATTENTE' | 'EN_COURS' | 'TERMINEE' | 'ECHOUEE';

export interface Bbox {
  x: number;
  y: number;
  largeur: number;
  hauteur: number;
}

export interface Detection {
  id: number;
  imageId: number;
  type: DetectionType;
  anomalie: string;
  confiance: number;
  statut: DetectionStatut;
  coupe: number;
  bbox: Bbox | null;
  cheminMasque: string | null;
}

export interface AnalyseLancee {
  examenId: number;
  statut: AnalyseStatut;
}

export interface AnalyseStatutInfo {
  examenId: number;
  statut: AnalyseStatut;
  message: string | null;
  finieLe: string | null;
}
