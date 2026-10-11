import { useCallback, useEffect, useState } from "react";
import { fetchFinanceTransactions } from "../services/financeService";

const useFinanceTransactions = (params = {}) => {
  const paramsKey = JSON.stringify(params);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pagination, setPagination] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchFinanceTransactions(JSON.parse(paramsKey));
      setTransactions(result.data);
      setPagination(result.pagination);
    } catch (e) {
      setTransactions([]);
      setError(e?.message || "Failed to fetch transactions");
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    load();
  }, [load]);

  return { transactions, pagination, loading, error, refetch: load };
};

export default useFinanceTransactions;
