/* Doxhund Vault — client-side zero-knowledge encryption (Step 2)
 *
 * AES-256-GCM with a key derived from a master password via PBKDF2-SHA256.
 * Runs entirely in the browser (or Node for testing). Plaintext never leaves
 * the client — only the opaque ciphertext envelope is meant to be stored or
 * transmitted, and it is unreadable without the password.
 *
 * Unlock strategy is deliberately pluggable: `deriveKey` is the single seam
 * where a WebAuthn / Passkey unlock can be added later without touching
 * `encrypt` / `decrypt`.
 */
(function (root, factory) {
  const vault = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = vault; // Node (tests)
  }
  root.DoxVault = vault; // browser
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const PBKDF2_ITERATIONS = 600000; // OWASP recommendation for PBKDF2-SHA256
  const SALT_BYTES = 16;
  const IV_BYTES = 12; // AES-GCM standard nonce size
  const KEY_BITS = 256;

  // Envelope contract. Anything outside these bounds is refused rather than
  // silently coerced, so a stored envelope can never negotiate its own KDF
  // strength down to something cheap to brute-force.
  const KDF_NAME = "PBKDF2-SHA256";
  const ALG_NAME = "AES-256-GCM";
  const MIN_ITERATIONS = 100000;
  const MAX_ITERATIONS = 10000000;

  const te = new TextEncoder();
  const td = new TextDecoder();

  function toB64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const CHUNK = 0x8000; // avoid stack overflow on large inputs
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin);
  }

  function fromB64(s) {
    return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  }

  function requirePassword(password) {
    if (typeof password !== "string" || password.length === 0) {
      throw new Error("vault: a non-empty password is required");
    }
  }

  /**
   * Read the KDF parameters out of an envelope and refuse anything we do not
   * support. Returns the iteration count to derive with.
   */
  function readKdfParams(envelope) {
    if (!envelope || typeof envelope !== "object") {
      throw new Error("vault: envelope must be an object");
    }
    if (envelope.alg !== ALG_NAME) {
      throw new Error("vault: unsupported cipher " + JSON.stringify(envelope.alg));
    }
    if (envelope.kdf !== KDF_NAME) {
      throw new Error("vault: unsupported KDF " + JSON.stringify(envelope.kdf));
    }
    const iterations = envelope.iterations;
    if (!Number.isInteger(iterations) || iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) {
      throw new Error("vault: iteration count outside the supported range: " + iterations);
    }
    for (const field of ["salt", "iv", "ciphertext"]) {
      if (typeof envelope[field] !== "string" || envelope[field].length === 0) {
        throw new Error("vault: envelope is missing " + field);
      }
    }
    return iterations;
  }

  // The single seam for key derivation. Swap in WebAuthn/PRF here later.
  // `iterations` is threaded through so decryption uses the parameters the
  // envelope was created with, not whatever the current default happens to be.
  async function deriveKey(password, saltBytes, iterations = PBKDF2_ITERATIONS) {
    requirePassword(password);
    const keyMaterial = await globalThis.crypto.subtle.importKey(
      "raw",
      te.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return globalThis.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBytes,
        iterations,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: KEY_BITS },
      false,
      ["encrypt", "decrypt"]
    );
  }

  /**
   * Encrypt plaintext with a password.
   * @returns {object} envelope — salt, iv, ciphertext (base64) + KDF params.
   */
  async function encrypt(plaintext, password) {
    requirePassword(password);
    const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const iv = globalThis.crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const key = await deriveKey(password, salt);
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      te.encode(plaintext)
    );
    return {
      kdf: KDF_NAME,
      iterations: PBKDF2_ITERATIONS,
      alg: ALG_NAME,
      salt: toB64(salt),
      iv: toB64(iv),
      ciphertext: toB64(ciphertext),
    };
  }

  /**
   * Decrypt an envelope with the password. Throws on wrong password / tampering
   * (AES-GCM authentication fails).
   */
  async function decrypt(envelope, password) {
    requirePassword(password);
    const iterations = readKdfParams(envelope);
    const key = await deriveKey(password, fromB64(envelope.salt), iterations);
    const plaintext = await globalThis.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(envelope.iv) },
      key,
      fromB64(envelope.ciphertext)
    );
    return td.decode(plaintext);
  }

  return {
    encrypt,
    decrypt,
    deriveKey,
    PBKDF2_ITERATIONS,
    MIN_ITERATIONS,
    MAX_ITERATIONS,
  };
});
