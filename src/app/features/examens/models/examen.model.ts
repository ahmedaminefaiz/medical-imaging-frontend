export interface ExamenSummary {
  examenId: number;
  mrn: string;
  patientNom: string;
  type: string;
  dateExamen: string; // ISO "YYYY-MM-DD", formaté en JJ/MM/AAAA à l'affichage
  modalite: string;
  nombreImages: number;
}
