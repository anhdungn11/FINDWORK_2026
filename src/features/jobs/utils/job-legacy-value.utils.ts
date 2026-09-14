/**
 * Adapter tạm cho dữ liệu mock hiện tại.
 *
 * Mock đang lưu salary/postedAt dưới dạng text hiển thị.
 * Backend thật không được thiết kế theo kiểu parse text UI.
 */
export const normalizeLegacyJobText = (
  value: string,
) => {
  return value
    .trim()
    .toLowerCase();
};

export const getLegacyPostedAgeHours = (
  postedAt: string,
) => {
  const value =
    normalizeLegacyJobText(
      postedAt,
    );

  if (value.includes("giờ")) {
    return Number(
      value.match(/\d+/)?.[0] ?? 0,
    );
  }

  if (value.includes("hôm nay")) {
    return 12;
  }

  if (value.includes("ngày")) {
    const days = Number(
      value.match(/\d+/)?.[0] ?? 0,
    );

    return days * 24;
  }

  return Number.MAX_SAFE_INTEGER;
};

export const getLegacySalaryValue = (
  salary: string,
) => {
  const value =
    salary.match(/\d+/);

  return value
    ? Number(value[0])
    : 0;
};
