import { Fragment } from "react";
import type { ProductRow } from "./inventory.shared";
import { getStatus } from "./inventory.shared";

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
      {children ? <div className="top-actions">{children}</div> : null}
    </header>
  );
}

export function ProductTable({ rows, editable = false }: { rows: ProductRow[]; editable?: boolean }) {
  const groups: { productId: string; title: string; indices: number[] }[] = [];
  rows.forEach((row, index) => {
    const group = groups[groups.length - 1];
    if (group && group.productId === row.productId) {
      group.indices.push(index);
    } else {
      groups.push({ productId: row.productId, title: row.title, indices: [index] });
    }
  });

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th scope="col">Product</th>
            <th scope="col">SKU</th>
            <th scope="col">Stock</th>
            <th scope="col">Minimum</th>
            <th scope="col">Reorder qty</th>
            <th scope="col">Status</th>
            <th scope="col">Notify</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((group, groupIndex) => {
            const isGrouped = group.indices.length > 1;

            return (
              <Fragment key={group.productId}>
                {isGrouped ? (
                  <tr className="product-group-row">
                    <td colSpan={7}>
                      <div className="product-group-title">
                        <span className={`swatch ${["coffee", "green", "blue", "rose"][groupIndex % 4]}`} />
                        <strong>{group.title}</strong>
                        <small>{group.indices.length} variants</small>
                      </div>
                    </td>
                  </tr>
                ) : null}
                {group.indices.map((index) => {
                  const row = rows[index];
                  const status = getStatus(row);

                  return (
                    <tr key={row.variantId} className={isGrouped ? "variant-row" : undefined}>
                      <td>
                        {editable ? (
                          <>
                            <input type="hidden" name={`productId:${index}`} value={row.productId} />
                            <input type="hidden" name={`variantId:${index}`} value={row.variantId} />
                            <input type="hidden" name={`productTitle:${index}`} value={row.title} />
                            <input type="hidden" name={`variantTitle:${index}`} value={row.variantTitle} />
                            <input type="hidden" name={`sku:${index}`} value={row.sku} />
                          </>
                        ) : null}
                        <div className={isGrouped ? "product indented" : "product"}>
                          {isGrouped ? null : (
                            <span className={`swatch ${["coffee", "green", "blue", "rose"][groupIndex % 4]}`} />
                          )}
                          <div>
                            {isGrouped ? <strong>{row.variantTitle}</strong> : <strong>{row.title}</strong>}
                            {isGrouped ? null : <small>{row.variantTitle}</small>}
                          </div>
                        </div>
                      </td>
                      <td>{row.sku}</td>
                      <td>
                        <strong>{row.available}</strong>
                      </td>
                      <td>
                        {editable ? (
                          <input
                            className="qty"
                            name={`minimumStock:${index}`}
                            type="number"
                            min="0"
                            defaultValue={row.minimumStock}
                            aria-label={`Minimum stock for ${row.title} ${row.variantTitle}`}
                          />
                        ) : (
                          row.minimumStock
                        )}
                      </td>
                      <td>
                        {editable ? (
                          <input
                            className="qty"
                            name={`reorderQuantity:${index}`}
                            type="number"
                            min="0"
                            defaultValue={row.reorderQuantity}
                            aria-label={`Reorder quantity for ${row.title} ${row.variantTitle}`}
                          />
                        ) : (
                          row.reorderQuantity
                        )}
                      </td>
                      <td>
                        <span className={`pill ${status.tone}`}>{status.label}</span>
                      </td>
                      <td>
                        <label className="switch">
                          <input
                            name={`watchEnabled:${index}`}
                            type="checkbox"
                            defaultChecked={row.watchEnabled}
                            disabled={!editable}
                          />
                          <span />
                        </label>
                      </td>
                    </tr>
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
