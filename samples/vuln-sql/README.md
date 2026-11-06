# vuln-sql

**FICTIONAL — for hackathon demo only.** Not real code from any product.

Planted bug: `searchOrders` and `deleteOrder` build SQL by string concatenation / template interpolation of request values, so a `status` of `x' OR '1'='1` returns every customer's orders. Fix: parameterised queries (`db.query("... WHERE customer_id = $1", [customerId])`).
