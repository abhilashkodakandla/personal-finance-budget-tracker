# Security: encryption and transport

This document describes how sensitive data is protected in the AI-Powered Finance Manager stack. It is **operational guidance** for deployments; it does not replace a full security review.

## Transport (HTTPS / TLS)

- **Browser and mobile clients** should call the API only over **HTTPS** in production. Terminate TLS at your reverse proxy (e.g. Nginx, Caddy, Cloudflare, AWS ALB) or your PaaS (Render, Railway, etc.).
- **Never** send tokens or passwords over plain HTTP in production.
- **Secrets** (JWT signing key, MongoDB URI, Plaid keys, `FIELD_ENCRYPTION_KEY`) belong in **environment variables** or a secrets manager—not in the repo.

## MongoDB Atlas

- **Encryption in transit:** Connect to Atlas with TLS (default for `mongodb+srv://` connections).
- **Encryption at rest:** Atlas **encrypts stored data at rest** by default (M10+ clusters offer additional options such as Customer-Managed Keys). See [MongoDB Atlas documentation](https://www.mongodb.com/docs/atlas/) for your cluster tier.
- **Network access:** Restrict Atlas IP allowlists / VPC peering to your app servers where possible.

## Application-level field encryption (optional)

The backend can encrypt **very sensitive string fields** before storing them in MongoDB, so plaintext never appears in the database.

### Implemented: Plaid access tokens

- **Model:** `PlaidAccessToken.accessToken`
- **Mechanism:** AES-256-GCM with a dedicated key (`FIELD_ENCRYPTION_KEY` in `backend/utils/fieldCrypto.js`).
- **Backward compatibility:** Values already stored as plaintext (no `enc:v1:` prefix) are still read correctly; new writes use encryption when the key is set.

### Enabling field encryption

1. Generate a 32-byte hex key (64 hex characters):

   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. Set in `backend/.env`:

   ```env
   FIELD_ENCRYPTION_KEY=<64-character-hex>
   ```

3. **Rotate keys** only with a planned migration (re-encrypt old rows); the current code does not auto-migrate.

### If `FIELD_ENCRYPTION_KEY` is unset

- The app **continues to work**; tokens are stored in plaintext (same as before this feature).  
- After enabling the key, **new** tokens are encrypted; older plaintext rows still decrypt via `decryptString` (pass-through for non-prefixed values).

## Related environment variables

| Variable                 | Purpose                                      |
|-------------------------|----------------------------------------------|
| `JWT_SECRET`            | Sign session JWTs                            |
| `FIELD_ENCRYPTION_KEY`  | Optional AES-256-GCM key for Plaid tokens    |
| `MONGODB_URI` / connection string | Atlas connection                     |

## Household data

Household and membership documents are **not** end-to-end encrypted in this app; they are protected by **Atlas encryption at rest**, **TLS in transit**, and **application access control** (JWT + membership checks on `/api/households/*`). Further isolation (e.g. per-tenant encryption) would require a dedicated design.
