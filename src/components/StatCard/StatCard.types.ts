export interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  glyph: string;
  /** 0-100 arası basit trend noktaları - mockup'taki mini grafik için. */
  trend?: number[];
}
