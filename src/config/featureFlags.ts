/**
 * Cờ tính năng phía giao diện.
 * ENABLE_WORKSPACE_WRITES: mặc định TẮT. Chỉ bật khi được phép ghi dữ liệu thật
 * (VITE_ENABLE_WORKSPACE_WRITES=true). Khi tắt, mọi thao tác ghi của Company/Admin
 * bị chặn ở tầng service, không gửi request nào tới Backend.
 */
let testOverride: boolean | null = null;

export const isWorkspaceWritesEnabled = (): boolean => {
  if (testOverride !== null) return testOverride;
  return import.meta.env?.VITE_ENABLE_WORKSPACE_WRITES === "true";
};

export const setWorkspaceWritesForTesting = (value: boolean | null): void => {
  testOverride = value;
};

/** Dữ liệu mẫu (fixture) chỉ được phép trong môi trường phát triển và khi bật ?demo=1. */
export const isDemoFixturesAllowed = (search: string): boolean =>
  Boolean(import.meta.env?.DEV) && new URLSearchParams(search).get("demo") === "1";
