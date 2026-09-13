import {
  useEffect,
  useState,
} from "react";

import type {
  WardOption,
} from "@/data/reference/locations/location.types";

import {
  getWardsByProvinceCode,
} from "@/services/reference/locationReferenceService";

export const useWardOptions = (
  provinceCode: string,
) => {
  const [wards, setWards] =
    useState<WardOption[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  useEffect(() => {
    if (!provinceCode) {
      setWards([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller =
      new AbortController();

    setIsLoading(true);
    setError(null);

    getWardsByProvinceCode(
      provinceCode,
      controller.signal,
    )
      .then((items) => {
        setWards(items);
      })
      .catch((cause: unknown) => {
        if (
          cause instanceof DOMException &&
          cause.name === "AbortError"
        ) {
          return;
        }

        setWards([]);
        setError(
          "Không thể tải danh sách phường / xã. Vui lòng thử lại.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [provinceCode]);

  return {
    wards,
    isLoading,
    error,
  };
};
