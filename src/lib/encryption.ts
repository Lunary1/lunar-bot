import crypto from "crypto";

interface EncryptionConfig {
  algorithm: string;
  keyLength: number;
  ivLength: number;
  tagLength: number;
}

const DEFAULT_CONFIG: EncryptionConfig = {
  algorithm: "aes-256-gcm",
  keyLength: 32, // 256 bits
  ivLength: 12, // 96 bits — canonical GCM IV length
  tagLength: 16, // 128 bits
};

export class EncryptionService {
  private key: Buffer;
  private config: EncryptionConfig;

  constructor(secretKey?: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const key = secretKey ?? process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error(
        "Encryption key not provided. Set ENCRYPTION_KEY environment variable.",
      );
    }

    // Use a per-installation random salt stored in ENCRYPTION_SALT env var.
    // Fall back to a static string with a warning so existing dev environments
    // don't break immediately, but production MUST set ENCRYPTION_SALT.
    let salt: Buffer | string;
    if (process.env.ENCRYPTION_SALT) {
      salt = Buffer.from(process.env.ENCRYPTION_SALT, "base64");
    } else {
      if (process.env.NODE_ENV === "production") {
        throw new Error(
          "ENCRYPTION_SALT is required in production. Generate one with: " +
            "node -e \"console.log(require('crypto').randomBytes(32).toString('base64'))\"",
        );
      }
      console.warn(
        "[EncryptionService] ENCRYPTION_SALT not set — using static fallback. " +
          "Set ENCRYPTION_SALT in .env for production security.",
      );
      salt = "lunarbot-v1-static-salt";
    }

    this.key = crypto.scryptSync(key, salt, this.config.keyLength);
  }

  /**
   * Encrypt data using AES-256-GCM with a random 12-byte IV per call.
   * Output format (base64): iv[12] || authTag[16] || ciphertext
   */
  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(12); // 96-bit IV for GCM
      const cipher = crypto.createCipheriv("aes-256-gcm", this.key, iv);

      const encrypted = Buffer.concat([
        cipher.update(data, "utf8"),
        cipher.final(),
      ]);
      const authTag = cipher.getAuthTag(); // always 16 bytes

      // Binary layout: iv (12) | authTag (16) | ciphertext
      return Buffer.concat([iv, authTag, encrypted]).toString("base64");
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt data encrypted by encrypt().
   * Also handles the legacy format (ivHex:tagHex:cipherHex encoded as base64)
   * so that a migration script can re-encrypt existing DB rows without a hard cutover.
   */
  decrypt(encryptedData: string): string {
    try {
      const buf = Buffer.from(encryptedData, "base64");

      // Detect legacy format: base64-decoded string contains two `:` separators
      const asText = buf.toString("utf8");
      if (asText.split(":").length === 3) {
        return this._decryptLegacy(asText);
      }

      // New binary format: iv[12] | authTag[16] | ciphertext
      if (buf.length < 28) {
        throw new Error("Invalid encrypted data: too short");
      }
      const iv = buf.subarray(0, 12);
      const authTag = buf.subarray(12, 28);
      const encrypted = buf.subarray(28);

      const decipher = crypto.createDecipheriv("aes-256-gcm", this.key, iv);
      decipher.setAuthTag(authTag);

      return (
        decipher.update(encrypted).toString("utf8") + decipher.final("utf8")
      );
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
  }

  /** @internal Handles the deprecated format produced by the old createCipher code. */
  private _decryptLegacy(combined: string): string {
    const parts = combined.split(":");
    if (parts.length !== 3)
      throw new Error("Invalid legacy encrypted data format");

    // The old encrypt() generated a random IV but never actually passed it to
    // createCipher, meaning every ciphertext shared an implicit zero IV. We can
    // still decrypt those values because createDecipher also uses no IV argument.
    const tag = Buffer.from(parts[1], "hex");
    const encrypted = parts[2];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const decipher = (crypto as any).createDecipher(
      this.config.algorithm,
      this.key,
    );
    decipher.setAAD(Buffer.from("lunarbot", "utf8"));
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * Hash data using SHA-256
   */
  hash(data: string, salt?: string): string {
    const hash = crypto.createHash("sha256");
    if (salt) {
      hash.update(data + salt);
    } else {
      hash.update(data);
    }
    return hash.digest("hex");
  }

  /**
   * Generate a secure random string
   */
  generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString("hex");
  }

  /**
   * Generate a secure random token
   */
  generateToken(): string {
    return crypto.randomBytes(32).toString("base64url");
  }

  /**
   * Verify hash
   */
  verifyHash(data: string, hash: string, salt?: string): boolean {
    const computedHash = this.hash(data, salt);
    return crypto.timingSafeEqual(
      Buffer.from(computedHash, "hex"),
      Buffer.from(hash, "hex"),
    );
  }
}

// Global encryption service instance
let globalEncryptionService: EncryptionService | null = null;

/**
 * Get or create the global encryption service
 */
export function getEncryptionService(): EncryptionService {
  if (!globalEncryptionService) {
    globalEncryptionService = new EncryptionService();
  }
  return globalEncryptionService;
}

/**
 * Encrypt sensitive data for database storage
 */
export function encryptSensitiveData(data: string): string {
  const encryptionService = getEncryptionService();
  return encryptionService.encrypt(data);
}

/**
 * Decrypt sensitive data from database
 */
export function decryptSensitiveData(encryptedData: string): string {
  const encryptionService = getEncryptionService();
  return encryptionService.decrypt(encryptedData);
}

/**
 * Hash password for storage
 */
export function hashPassword(password: string): { hash: string; salt: string } {
  const encryptionService = getEncryptionService();
  const salt = encryptionService.generateRandomString(16);
  const hash = encryptionService.hash(password, salt);
  return { hash, salt };
}

/**
 * Verify password
 */
export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): boolean {
  const encryptionService = getEncryptionService();
  return encryptionService.verifyHash(password, hash, salt);
}

/**
 * Encrypt user credentials
 */
export function encryptCredentials(
  username: string,
  password: string,
): {
  encryptedUsername: string;
  encryptedPassword: string;
} {
  const encryptionService = getEncryptionService();
  return {
    encryptedUsername: encryptionService.encrypt(username),
    encryptedPassword: encryptionService.encrypt(password),
  };
}

/**
 * Decrypt user credentials
 */
export function decryptCredentials(
  encryptedUsername: string,
  encryptedPassword: string,
): { username: string; password: string } {
  const encryptionService = getEncryptionService();
  return {
    username: encryptionService.decrypt(encryptedUsername),
    password: encryptionService.decrypt(encryptedPassword),
  };
}

/**
 * Encrypt proxy configuration
 */
export function encryptProxyConfig(proxy: {
  host: string;
  port: number;
  username?: string;
  password?: string;
}): string {
  const encryptionService = getEncryptionService();
  const proxyData = JSON.stringify(proxy);
  return encryptionService.encrypt(proxyData);
}

/**
 * Decrypt proxy configuration
 */
export function decryptProxyConfig(encryptedProxy: string): {
  host: string;
  port: number;
  username?: string;
  password?: string;
} {
  const encryptionService = getEncryptionService();
  const proxyData = encryptionService.decrypt(encryptedProxy);
  return JSON.parse(proxyData);
}

/**
 * Generate API key
 */
export function generateApiKey(): string {
  const encryptionService = getEncryptionService();
  return `lunarbot_${encryptionService.generateToken()}`;
}

/**
 * Validate API key format
 */
export function isValidApiKey(apiKey: string): boolean {
  return apiKey.startsWith("lunarbot_") && apiKey.length > 20;
}

/**
 * Secure comparison of strings
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
