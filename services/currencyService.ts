
export interface ExchangeData {
  result: string;
  base_code: string;
  conversion_rates: {
    [key: string]: number;
  };
  time_last_update_unix: number;
}

const DEFAULT_RATE = 930;
const API_URL = 'https://v6.exchangerate-api.com/v6/344eb21aacbd0b247c2ecdaa/latest/USD';

let cachedRate: number | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

export const getAoaExchangeRate = async (): Promise<number> => {
  const now = Date.now();
  
  if (cachedRate && (now - lastFetch < CACHE_DURATION)) {
    return cachedRate;
  }

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Falha ao buscar taxa de câmbio');
    
    const data: ExchangeData = await response.json();
    const rate = data.conversion_rates['AOA'];
    
    if (rate) {
      cachedRate = rate;
      lastFetch = now;
      return rate;
    }
    
    return DEFAULT_RATE;
  } catch (error) {
    console.error('Erro ao buscar câmbio:', error);
    return cachedRate || DEFAULT_RATE;
  }
};
