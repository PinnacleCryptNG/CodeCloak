// FICTIONAL — for hackathon demo only.
type Pool = { query(sql: string): Promise<{ rows: unknown[] }> };

export async function searchOrders(db: Pool, customerId: string, status: string) {
  const sql =
    "SELECT id, total, status FROM orders WHERE customer_id = '" +
    customerId +
    "' AND status = '" +
    status +
    "' ORDER BY created_at DESC";
  const result = await db.query(sql);
  return result.rows;
}

export async function deleteOrder(db: Pool, orderId: string) {
  await db.query(`DELETE FROM orders WHERE id = ${orderId}`);
}
