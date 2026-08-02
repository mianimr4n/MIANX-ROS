/**
 * Deterministic Analytics order_items schema guard (source contract).
 * Used by Vitest under `pnpm test` / CI. Does not touch live databases.
 */

export type AnalyticsOrderItemsViolation = {
  file: string;
  selectList: string;
  message: string;
};

export const FORBIDDEN_ORDER_ITEMS_NAME_MESSAGE =
  "order_items.name is not a valid Analytics schema field; use product_name and preserve menu_item_id aggregation.";

export function extractOrderItemsSelectLists(source: string): string[] {
  const lists: string[] = [];
  const re = /\.from\(\s*(["'])order_items\1\s*\)\s*\.select\(\s*(["'`])([\s\S]*?)\2\s*\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    lists.push(match[3].replace(/\s+/g, " ").trim());
  }
  return lists;
}

export function parseSelectColumns(selectList: string): string[] {
  return selectList
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const noAlias = part.split(/\s+as\s+/i)[0].trim();
      const bare = noAlias.includes(".") ? (noAlias.split(".").pop() ?? noAlias) : noAlias;
      return bare.replace(/["'`]/g, "").trim();
    })
    .filter(Boolean);
}

export function selectListRequestsOrderItemsName(selectList: string): boolean {
  return parseSelectColumns(selectList).includes("name");
}

export function selectListRequestsProductName(selectList: string): boolean {
  return parseSelectColumns(selectList).includes("product_name");
}

export function selectListRequestsMenuItemId(selectList: string): boolean {
  return parseSelectColumns(selectList).includes("menu_item_id");
}

export function analyzeAnalyticsOrderItemsSource(
  source: string,
  fileLabel: string,
): {
  selects: string[];
  violations: AnalyticsOrderItemsViolation[];
  missingProductName: AnalyticsOrderItemsViolation[];
} {
  const selects = extractOrderItemsSelectLists(source);
  const violations: AnalyticsOrderItemsViolation[] = [];
  const missingProductName: AnalyticsOrderItemsViolation[] = [];

  for (const selectList of selects) {
    if (selectListRequestsOrderItemsName(selectList)) {
      violations.push({
        file: fileLabel,
        selectList,
        message: FORBIDDEN_ORDER_ITEMS_NAME_MESSAGE,
      });
    }
    if (
      selectListRequestsMenuItemId(selectList) &&
      parseSelectColumns(selectList).includes("quantity") &&
      !selectListRequestsProductName(selectList)
    ) {
      missingProductName.push({
        file: fileLabel,
        selectList,
        message:
          "Analytics order_items quantity selections that group by menu_item_id must select product_name (order-time snapshot).",
      });
    }
  }

  return { selects, violations, missingProductName };
}
