const crypto = require("crypto");

const PREFIX = "enc:v1:";
const KEY_HEX_LEN = 64;

function isEncryptionEnabled() {
  const k = process.env.FIELD_ENCRYPTION_KEY;
  return typeof k === "string" && k.length === KEY_HEX_LEN;
}

/**
 * AES-256-GCM field encryption. If FIELD_ENCRYPTION_KEY is unset or invalid, returns plaintext unchanged.
 * Key: 32-byte hex string (64 chars), e.g. `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 */
function encryptString(plain) {
  if (plain == null || plain === "") return plain;
  if (!isEncryptionEnabled()) return plain;

  const key = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, "hex");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

function decryptString(stored) {
  if (stored == null || stored === "") return stored;
  if (typeof stored !== "string" || !stored.startsWith(PREFIX)) return stored;

  if (!isEncryptionEnabled()) {
    return stored;
  }

  const raw = stored.slice(PREFIX.length);
  const parts = raw.split(":");
  if (parts.length !== 3) return stored;

  const [ivHex, tagHex, dataHex] = parts;
  const key = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, "hex");
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const data = Buffer.from(dataHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

module.exports = {
  encryptString,
  decryptString,
  isEncryptionEnabled,
};
