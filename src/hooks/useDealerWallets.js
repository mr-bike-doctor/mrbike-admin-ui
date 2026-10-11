import { useCallback, useEffect, useState } from "react";
import { fetchDealerWallets } from "../services/financeService";

const useDealerWallets = (params = {}) => {
  const paramsKey = JSON.stringify(params);
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchDealerWallets(JSON.parse(paramsKey));
      setWallets(result.data);
      setPagination(result.pagination);
    } catch (e) {
      setWallets([]);
      setError(e?.message || "Failed to fetch dealer wallets");
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { wallets, pagination, loading, error, refetch: load };
};

export default useDealerWallets;
