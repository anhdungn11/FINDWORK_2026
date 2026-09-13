import type { SkillCatalogItem } from "../skill.types";

export const OPERATIONS_SKILLS: SkillCatalogItem[] = [
  {
    code: "supply-chain-management",
    name: "Quản lý chuỗi cung ứng",
    categoryCode: "logistics-supply-chain",
    aliases: ["Supply Chain Management", "SCM"],
  },
  {
    code: "warehouse-management",
    name: "Quản lý kho",
    categoryCode: "logistics-supply-chain",
    aliases: ["Warehouse Management"],
  },
  {
    code: "inventory-management",
    name: "Quản lý tồn kho",
    categoryCode: "logistics-supply-chain",
    aliases: ["Inventory Management"],
  },
  {
    code: "food-service",
    name: "Phục vụ nhà hàng",
    categoryCode: "hospitality",
    aliases: ["Food Service"],
  },
  {
    code: "hotel-operations",
    name: "Vận hành khách sạn",
    categoryCode: "hospitality",
    aliases: ["Hotel Operations"],
  },
];
