
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
};

export const convertCurrency = (amount: number, from: string, to: string): number => {
  // Simplistic conversion for now
  const rates: Record<string, number> = {
    'USD': 1,
    'AOA': 850,
    'BRL': 5.2,
    'EUR': 0.92
  };
  
  if (!rates[from] || !rates[to]) return amount;
  return (amount / rates[from]) * rates[to];
};

export const getAoaExchangeRate = (): number => 850;
