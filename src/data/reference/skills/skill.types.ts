export interface SkillCategoryOption {
  code: string;
  name: string;
  parentCode: string | null;
}

export interface SkillCatalogItem {
  /**
   * Business code ổn định.
   *
   * Không dùng array index hoặc database ID làm business identifier.
   */
  code: string;

  /**
   * Tên chuẩn để hiển thị.
   */
  name: string;

  /**
   * Category mà skill thuộc về.
   */
  categoryCode: string;

  /**
   * Các tên thường dùng khác, phục vụ search/matching.
   */
  aliases: string[];
}
