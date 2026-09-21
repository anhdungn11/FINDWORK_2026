import { useEffect, useMemo, useRef, useState } from "react";

import styles from "../ResumeEditor.module.css";

interface SearchableSelectFieldProps {
  label: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (value: string) => void;
  required?: boolean;
  hint?: string;
  customLabel?: string;
}

const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();

const SearchableSelectField = ({
  label,
  value,
  options,
  placeholder,
  onChange,
  required = false,
  hint,
  customLabel = "Giá trị khác",
}: SearchableSelectFieldProps) => {
  const isKnownValue = options.includes(value);
  const [customMode, setCustomMode] = useState(Boolean(value) && !isKnownValue);
  const [query, setQuery] = useState(isKnownValue ? value : "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const known = options.includes(value);
    setCustomMode(Boolean(value) && !known);
    if (known) setQuery(value);
    if (!value) setQuery("");
  }, [options, value]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return options.slice(0, 12);
    return options
      .filter((option) => normalize(option).includes(normalizedQuery))
      .slice(0, 12);
  }, [options, query]);

  if (customMode) {
    return (
      <label className={styles.field}>
        <span className={styles.fieldLabel}>
          {label}
          {required && <b>*</b>}
        </span>
        <div className={styles.customValueRow}>
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={customLabel}
            autoFocus
          />
          <button
            type="button"
            className={styles.inlineBackButton}
            onClick={() => {
              onChange("");
              setQuery("");
              setCustomMode(false);
              setOpen(true);
            }}
          >
            Chọn từ danh sách
          </button>
        </div>
        {hint && <small>{hint}</small>}
      </label>
    );
  }

  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>
        {label}
        {required && <b>*</b>}
      </span>
      <div className={styles.searchSelect} ref={rootRef}>
        <input
          value={query}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (value) onChange("");
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
        />
        <span className={styles.searchSelectChevron} aria-hidden="true">⌄</span>
        {open && (
          <div className={styles.searchSelectMenu} role="listbox">
            <div className={styles.searchSelectResults}>
              {filtered.length > 0 ? (
                filtered.map((option) => (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={option === value}
                    className={option === value ? styles.searchSelectOptionActive : styles.searchSelectOption}
                    onClick={() => {
                      onChange(option);
                      setQuery(option);
                      setOpen(false);
                    }}
                  >
                    {option}
                  </button>
                ))
              ) : (
                <div className={styles.searchSelectEmpty}>Không tìm thấy trong danh sách.</div>
              )}
            </div>
            <button
              type="button"
              className={styles.searchSelectOther}
              onClick={() => {
                const initial = query.trim();
                onChange(initial);
                setCustomMode(true);
                setOpen(false);
              }}
            >
              + Không có? Nhập {customLabel.toLowerCase()}
            </button>
          </div>
        )}
      </div>
      {hint && <small>{hint}</small>}
    </label>
  );
};

export default SearchableSelectField;
