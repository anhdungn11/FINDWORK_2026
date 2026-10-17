export type ParsedCompanyId =
  | { kind: "mock"; id: number }
  | { kind: "backend"; id: string }
  | { kind: "invalid" };

/** Mock records use positive integers; Prisma Company.id uses UUID strings. */
export const parseCompanyId = (value: string | undefined): ParsedCompanyId => {
  if (!value) return { kind: "invalid" };
  if (/^[1-9]\d*$/.test(value)) {
    const id = Number(value);
    return Number.isSafeInteger(id) ? { kind: "mock", id } : { kind: "invalid" };
  }
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return { kind: "backend", id: value };
  }
  return { kind: "invalid" };
};
