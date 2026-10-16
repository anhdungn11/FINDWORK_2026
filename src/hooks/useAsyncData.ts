import { useCallback, useEffect, useRef, useState } from "react";
import { toApiFailure, type ApiFailure } from "@/services/api/apiFailure";

export interface AsyncState<T> {
  data: T | null;
  error: ApiFailure | null;
  loading: boolean;
  reload: () => void;
}

/**
 * Tải dữ liệu bất đồng bộ an toàn: hủy request cũ, bỏ qua phản hồi muộn (race),
 * xóa lỗi cũ khi tải lại thành công. `enabled=false` => không gọi API.
 */
export function useAsyncData<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  deps: ReadonlyArray<unknown>,
  enabled = true,
): AsyncState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiFailure | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [tick, setTick] = useState(0);
  const seq = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    const current = ++seq.current;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetcherRef.current(controller.signal)
      .then((result) => {
        if (seq.current !== current) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => {
        if (seq.current !== current || controller.signal.aborted) return;
        setData(null);
        setError(toApiFailure(e));
      })
      .finally(() => {
        if (seq.current === current) setLoading(false);
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload };
}
