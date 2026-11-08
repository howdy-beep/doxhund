/* Doxhund Vault — dependency-free Node tests using the built-in test runner.
 *
 * Run: node web/js/vault.test.js  (from the repo root)
 * Uses node:test + node:assert; requires Node 18+ (global subtle crypto).
 */
"use strict";

const { test } = require("node:test");
const assert = require("node:assert");
const {
  encrypt,
  decrypt,
  deriveKey,
  PBKDF2_ITERATIONS,
  MIN_ITERATIONS,
  MAX_ITERATIONS,
} = require("./vault.js");

test("encrypt -> decrypt round-trips to the original plaintext", async () => {
  const plaintext = "Jane Doe • 742 Evergreen Terrace • (555) 555-0142";
  const envelope = await encrypt(plaintext, "correct horse battery staple");
  const recovered = await decrypt(envelope, "correct horse battery staple");
  assert.strictEqual(recovered, plaintext);
});

test("wrong password throws on decrypt", async () => {
  const envelope = await encrypt("secret data", "right-password");
  await assert.rejects(decrypt(envelope, "wrong-password"));
});

test("tampered ciphertext throws on decrypt", async () => {
  const envelope = await encrypt("secret data", "right-password");
  const tampered = {
    ...envelope,
    ciphertext: Buffer.from(envelope.ciphertext, "base64")
      .map((b, i) => (i === 3 ? (b ^ 0x01) & 0xff : b)) // flip a byte
      .toString("base64"),
  };
  await assert.rejects(decrypt(tampered, "right-password"));
});

test("envelope carries correct KDF/alg metadata and base64 fields", async () => {
  const envelope = await encrypt("secret data", "right-password");
  assert.strictEqual(envelope.kdf, "PBKDF2-SHA256");
  assert.strictEqual(envelope.iterations, 600000);
  assert.strictEqual(PBKDF2_ITERATIONS, 600000);
  assert.strictEqual(envelope.alg, "AES-256-GCM");
  for (const field of ["salt", "iv", "ciphertext"]) {
    assert.ok(typeof envelope[field] === "string" && envelope[field].length > 0);
    // Must be valid base64 round-tripping to non-empty bytes.
    assert.ok(Buffer.from(envelope[field], "base64").length > 0);
  }
});

test("deriveKey produces a 256-bit AES-GCM key for a fixed salt", async () => {
  const salt = new Uint8Array(16).fill(7);
  const key = await deriveKey("fixed-password", salt);
  // The vault's own key is deliberately non-extractable (can't be exfiltrated).
  // Its AES-GCM algorithm.length reflects the actual key size in bits.
  assert.strictEqual(key.type, "secret");
  assert.strictEqual(key.algorithm.name, "AES-GCM");
  assert.strictEqual(key.algorithm.length, 256, "key should be 256-bit AES-GCM");
  assert.strictEqual(key.extractable, false, "vault keys are non-extractable");
  await assert.rejects(crypto.subtle.exportKey("raw", key));

  // Do the real export length check on an extractable key derived identically
  // (same PBKDF2 params, same salt) to confirm the full pipeline yields 256 bits.
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode("fixed-password"),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const extractable = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const raw = await crypto.subtle.exportKey("raw", extractable);
  assert.strictEqual(raw.byteLength, 32, "256-bit AES-GCM key = 32 bytes");
});

test("empty password is refused on encrypt and decrypt", async () => {
  await assert.rejects(encrypt("secret data", ""), /non-empty password/);
  const envelope = await encrypt("secret data", "right-password");
  await assert.rejects(decrypt(envelope, ""), /non-empty password/);
});

test("decrypt derives with the iteration count stored in the envelope", async () => {
  // Build an envelope by hand at a non-default iteration count. If decrypt
  // ignored envelope.iterations and used the module default, the derived key
  // would differ and AES-GCM authentication would fail here.
  const iterations = MIN_ITERATIONS;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey("envelope-password", salt, iterations);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode("derived at " + iterations)
  );
  const envelope = {
    kdf: "PBKDF2-SHA256",
    iterations,
    alg: "AES-256-GCM",
    salt: Buffer.from(salt).toString("base64"),
    iv: Buffer.from(iv).toString("base64"),
    ciphertext: Buffer.from(ciphertext).toString("base64"),
  };
  assert.strictEqual(await decrypt(envelope, "envelope-password"), "derived at " + iterations);

  // Editing the declared count must break authentication, proving the field
  // is load-bearing rather than decorative metadata.
  await assert.rejects(decrypt({ ...envelope, iterations: iterations * 2 }, "envelope-password"));
});

test("envelopes declaring an unsupported cipher, KDF or iteration count are refused", async () => {
  const envelope = await encrypt("secret data", "right-password");

  await assert.rejects(decrypt({ ...envelope, alg: "AES-128-CBC" }, "right-password"), /unsupported cipher/);
  await assert.rejects(decrypt({ ...envelope, kdf: "scrypt" }, "right-password"), /unsupported KDF/);
  await assert.rejects(decrypt({ ...envelope, iterations: undefined }, "right-password"), /iteration count/);
  await assert.rejects(decrypt({ ...envelope, iterations: 1000 }, "right-password"), /iteration count/);
  await assert.rejects(decrypt({ ...envelope, iterations: MAX_ITERATIONS + 1 }, "right-password"), /iteration count/);
  await assert.rejects(decrypt({ ...envelope, iterations: 600000.5 }, "right-password"), /iteration count/);
});

test("envelopes missing a base64 field are refused with a specific error", async () => {
  const envelope = await encrypt("secret data", "right-password");
  await assert.rejects(decrypt({ ...envelope, iv: "" }, "right-password"), /missing iv/);
  await assert.rejects(decrypt({ ...envelope, salt: undefined }, "right-password"), /missing salt/);
  await assert.rejects(decrypt(null, "right-password"), /must be an object/);
});
