// types/balance.ts

export type Commodity = 'palm' | 'soybean' | 'sunflower' | 'rapeseed' | 'coconut';
export type Region = 'global' | 'indonesia' | 'malaysia' | 'eu' | 'ukraine' | 'central_asia' | 'caucasus' | 'serbia' | 'poland';
export type Metric = 'production' | 'consumption' | 'exports' | 'imports' | 'ending_stocks';

export interface BalanceData {
  commodity: Commodity;
  region: Region;
  metric: Metric;
  value: number;        // в 000' MT
  unit: string;         // '000 MT'
  period: string;       // 'YYYY-MM'
  updated_at: string;   // ISO date
  source: string;       // 'MPOC', 'USDA', etc.
}

export interface BalanceSeries {
  commodity: Commodity;
  region: Region;
  metric: Metric;
  data: { period: string; value: number }[]; // массив точек для графика
  source: string;
}

export interface BalanceTable {
  commodity: Commodity;
  region: Region;
  rows: {
    metric: Metric;
    current: number;    // последний период
    previous: number;   // период назад
    change: number;     // % изменения
    unit: string;
  }[];
  updated: string;
}
