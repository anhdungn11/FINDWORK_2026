import React, { useState, useEffect, useMemo, useRef } from "react";
import { VIETNAM_PROVINCES } from "../../../data/reference/locations/provinces";
import { useWardOptions } from "../../../hooks/useWardOptions";
import { searchProvincesWithMergers, SearchProvinceResult } from "./locationMergerReference";
import type { LocationSelectProps, LocationValue } from "./types";
import styles from "./LocationSelect.module.css";

export const LocationSelect: React.FC<LocationSelectProps> = ({
  id = "location-select",
  label = "Địa chỉ",
  value = {},
  onChange,
  required = false,
  disabled = false,
  includeWard = true,
  includeAddressLine = true,
  error,
  placeholder = "Nhập tên tỉnh/thành hoặc địa danh sáp nhập (ví dụ: Hà Tây, Sông Bé...)",
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProvinceCode = value.provinceCode ?? "";
  const selectedProvinceName = value.provinceName ?? "";
  const selectedWardCode = value.wardCode ?? "";
  const selectedWardName = value.wardName ?? "";
  const addressLine = value.addressLine ?? "";

  const { wards, isLoading: isWardsLoading, error: wardError } = useWardOptions(selectedProvinceCode);

  // Sync display search query when value.provinceName changes from outside
  useEffect(() => {
    if (selectedProvinceName && !isDropdownOpen) {
      setSearchQuery(selectedProvinceName);
    }
  }, [selectedProvinceName, isDropdownOpen]);

  // Handle outside click to close province suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        // Reset query back to selected province name if closed without picking
        if (selectedProvinceName) {
          setSearchQuery(selectedProvinceName);
        } else {
          setSearchQuery("");
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [selectedProvinceName]);

  const searchResults = useMemo(() => {
    return searchProvincesWithMergers(searchQuery);
  }, [searchQuery]);

  const buildFormattedAddress = (
    addr: string,
    ward: string | undefined,
    province: string,
  ): string => {
    return [addr.trim(), ward?.trim(), province.trim()].filter(Boolean).join(", ");
  };

  const handleSelectProvince = (result: SearchProvinceResult) => {
    setSearchQuery(result.name);
    setIsDropdownOpen(false);

    const newFormatted = buildFormattedAddress(
      addressLine,
      undefined, // Reset ward when province changes
      result.name,
    );

    onChange({
      provinceCode: result.code,
      provinceName: result.name,
      wardCode: undefined,
      wardName: undefined,
      addressLine: addressLine || undefined,
      formattedAddress: newFormatted,
    });
  };

  const handleWardChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const wardCode = e.target.value;
    const ward = wards.find((w) => w.code === wardCode);
    const wardName = ward?.name;

    const newFormatted = buildFormattedAddress(
      addressLine,
      wardName,
      selectedProvinceName,
    );

    onChange({
      provinceCode: selectedProvinceCode,
      provinceName: selectedProvinceName,
      wardCode: wardCode || undefined,
      wardName: wardName || undefined,
      addressLine: addressLine || undefined,
      formattedAddress: newFormatted,
    });
  };

  const handleAddressLineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newAddressLine = e.target.value;
    const newFormatted = buildFormattedAddress(
      newAddressLine,
      selectedWardName,
      selectedProvinceName,
    );

    onChange({
      provinceCode: selectedProvinceCode,
      provinceName: selectedProvinceName,
      wardCode: selectedWardCode || undefined,
      wardName: selectedWardName || undefined,
      addressLine: newAddressLine || undefined,
      formattedAddress: newFormatted,
    });
  };

  return (
    <div className={styles.container} id={id}>
      {label && (
        <div className={styles.mainLabel}>
          <span>{label}</span>
          {required && <span className={styles.required}>*</span>}
        </div>
      )}

      <div className={`${styles.grid} ${includeWard ? styles.gridTwoCol : ""}`}>
        {/* Province Autocomplete / Search */}
        <div className={styles.fieldGroup} ref={dropdownRef}>
          <label htmlFor={`${id}-province`} className={styles.subLabel}>
            Tỉnh / Thành phố
            {required && <span className={styles.required}>*</span>}
          </label>
          <div className={styles.provinceSearchWrapper}>
            <input
              id={`${id}-province`}
              type="text"
              className={`${styles.input} ${error ? styles.inputError : ""}`}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
            />
            {isDropdownOpen && !disabled && (
              <ul className={styles.searchResultsList} role="listbox">
                {searchResults.length > 0 ? (
                  searchResults.map((item) => (
                    <li
                      key={`${item.code}-${item.matchedAlias || "direct"}`}
                      role="option"
                      aria-selected={item.code === selectedProvinceCode}
                      className={`${styles.searchResultItem} ${
                        item.code === selectedProvinceCode ? styles.searchResultItemActive : ""
                      }`}
                      onClick={() => handleSelectProvince(item)}
                    >
                      <span>{item.name}</span>
                      {item.matchedAlias && (
                        <span className={styles.aliasBadge} title={item.note}>
                          Sáp nhập: {item.matchedAlias}
                        </span>
                      )}
                    </li>
                  ))
                ) : (
                  <li className={styles.emptyResults}>Không tìm thấy tỉnh/thành phù hợp</li>
                )}
              </ul>
            )}
          </div>
          <span className={styles.helperText}>Hỗ trợ tìm kiếm theo 34 tỉnh/thành hoặc tên cũ (Hà Tây, Sông Bé...)</span>
        </div>

        {/* Ward Cascading Dropdown */}
        {includeWard && (
          <div className={styles.fieldGroup}>
            <label htmlFor={`${id}-ward`} className={styles.subLabel}>
              Phường / Xã / Đặc khu
              {required && <span className={styles.required}>*</span>}
            </label>
            <select
              id={`${id}-ward`}
              className={`${styles.select} ${error ? styles.selectError : ""}`}
              value={selectedWardCode}
              onChange={handleWardChange}
              disabled={disabled || !selectedProvinceCode || isWardsLoading}
            >
              <option value="">
                {!selectedProvinceCode
                  ? "— Chọn tỉnh/thành trước —"
                  : isWardsLoading
                  ? "Đang tải danh sách..."
                  : "— Chọn phường / xã / đặc khu —"}
              </option>
              {wards.map((ward) => (
                <option key={ward.code} value={ward.code}>
                  {ward.divisionType ? `${ward.divisionType} ${ward.name}` : ward.name}
                </option>
              ))}
            </select>
            {wardError && <span className={styles.errorText}>{wardError}</span>}
          </div>
        )}
      </div>

      {/* Specific Address Line */}
      {includeAddressLine && (
        <div className={styles.fieldGroup}>
          <label htmlFor={`${id}-addressLine`} className={styles.subLabel}>
            Địa chỉ cụ thể (Số nhà, ngõ/ngách, tên đường, tòa nhà)
          </label>
          <input
            id={`${id}-addressLine`}
            type="text"
            className={styles.input}
            value={addressLine}
            onChange={handleAddressLineChange}
            placeholder="Ví dụ: Tầng 5, Tòa Keangnam Landmark 72, Đường Phạm Hùng"
            disabled={disabled}
          />
        </div>
      )}

      {/* Formatted Address Preview */}
      {value.formattedAddress && (
        <div className={styles.previewBadge}>
          <span className={styles.previewLabel}>Địa chỉ đầy đủ:</span>
          <span>{value.formattedAddress}</span>
        </div>
      )}

      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  );
};

export default LocationSelect;
