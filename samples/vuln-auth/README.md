# vuln-auth

**FICTIONAL — for hackathon demo only.** Not real code from any product.

Planted bugs:
- `verifyToken` trusts the token's own `alg` header with no allow-list: a token with `"alg":"none"` is accepted unsigned.
- Signatures are compared with `==` instead of a constant-time compare (`crypto.timingSafeEqual`).
- `login` compares a plaintext stored password with `==`: no hashing (bcrypt/argon2), no constant-time compare.
