export type ProductRow = {
  productId: string;
  variantId: string;
  title: string;
  variantTitle: string;
  sku: string;
  imageUrl: string | null;
  available: number;
  committed: number;
  minimumStock: number;
  reorderQuantity: number;
  watchEnabled: boolean;
};

export function getStatus(row: ProductRow) {
  if (!row.watchEnabled) return { label: "Muted", tone: "muted" };
  if (row.available <= 0) return { label: "Out", tone: "danger" };
  if (row.available <= row.minimumStock) return { label: "Low", tone: "danger" };
  if (row.available <= row.minimumStock + 5) return { label: "Near", tone: "warning" };
  return { label: "Healthy", tone: "ok" };
}
