
export interface ExchangeRates {
  USD: number;
  BRL: number;
  EUR: number;
  AOA: number;
  [key: string]: number;
}

export interface ExchangeData {
  result: string;
  base_code: string;
  conversion_rates: ExchangeRates;
  time_last_update_unix: number;
}

const DEFAULT_RATE = 930;
const API_URL = 'https://v6.exchangerate-api.com/v6/344eb21aacbd0b247c2ecdaa/latest/USD';

let cachedRates: ExchangeRates | null = null;
let lastFetch: number = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hora

export const getExchangeRates = async (): Promise<ExchangeRates> => {
  const now = Date.now();
  
  if (cachedRates && (now - lastFetch < CACHE_DURATION)) {
    return cachedRates;
  }

  try {
    const response = await fetch(API_URL);
    if (!response.ok) throw new Error('Falha ao buscar taxa de câmbio');
    
    const data: ExchangeData = await response.json();
    
    if (data.result === 'success') {
      cachedRates = data.conversion_rates;
      lastFetch = now;
      return cachedRates;
    }
    
    throw new Error('API returned failure');
  } catch (error) {
    console.error('Erro ao buscar câmbio:', error);
    return cachedRates || {
      USD: 1,
      BRL: 5.25,
      EUR: 0.93,
      AOA: DEFAULT_RATE
    };
  }
};

export const getAoaExchangeRate = async (): Promise<number> => {
  const rates = await getExchangeRates();
  return rates.AOA || DEFAULT_RATE;
};
