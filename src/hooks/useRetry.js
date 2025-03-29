import { useState, useCallback } from "react";

export function useRetry(operation) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const retry = useCallback(async () => {
    if (isRetrying || countdown > 0) return;

    setIsRetrying(true);
    try {
      const result = await operation();
      setIsRetrying(false);
      return result;
    } catch (err) {
      setIsRetrying(false);
      setCountdown(3);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return null;
    }
  }, [isRetrying, countdown, operation]);

  return { retry, isRetrying, countdown };
}
