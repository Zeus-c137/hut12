import { useState, useEffect } from 'react';

// Global cache to avoid repeated API calls
let cachedCurrency: "UGX" | "USD" | null = null;
const EXCHANGE_RATE = 3700; // 1 USD = 3700 UGX

// Simple event listener list to sync across all hooks
const listeners: Array<(currency: "UGX" | "USD") => void> = [];

function setGlobalCurrency(val: "UGX" | "USD") {
  cachedCurrency = val;
  if (typeof window !== 'undefined') {
    localStorage.setItem("user_currency", val);
  }
  listeners.forEach(l => l(val));
}

// Synchronously restore from localStorage on script import to prevent initial-mount mismatches
if (typeof window !== 'undefined') {
  const stored = localStorage.getItem("user_currency") as "UGX" | "USD" | null;
  if (stored) {
    cachedCurrency = stored;
  }
}

export function useCurrency() {
  const [currency, setCurrency] = useState<"UGX" | "USD">(cachedCurrency || "UGX");

  useEffect(() => {
    const handleUpdate = (newVal: "UGX" | "USD") => {
      setCurrency(newVal);
    };
    listeners.push(handleUpdate);

    // If cache already populated, make sure we reflect it instantly
    if (cachedCurrency) {
      setCurrency(cachedCurrency);
    } else {
      // Auto-detect based on IP
      fetch('https://ipapi.co/json/')
        .then(res => res.json())
        .then(data => {
          const detected = data.country_code === 'UG' ? 'UGX' : 'USD';
          setGlobalCurrency(detected);
        })
        .catch(err => {
          console.error('Failed to auto-detect location', err);
          setGlobalCurrency('UGX');
        });
    }

    return () => {
      const index = listeners.indexOf(handleUpdate);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }, []);

  const formatCurrency = (amountUgx: number) => {
    if (currency === "USD") {
      const usdAmount = amountUgx / EXCHANGE_RATE;
      return '$' + usdAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } else {
      return 'UGX ' + amountUgx.toLocaleString();
    }
  };

  return { currency, formatCurrency, EXCHANGE_RATE };
}

