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
  ivLength: 16, // 128 bits
  tagLength: 16, // 128 bits
};

export class EncryptionService {
  private key: Buffer;
  private config: EncryptionConfig;

  constructor(secretKey?: string, config: Partial<EncryptionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (secretKey) {
      // Use provided secret key
      this.key = crypto.scryptSync(secretKey, "salt", this.config.keyLength);
    } else {
      // Use environment variable or generate new key
      const envKey = process.env.ENCRYPTION_KEY;
      if (envKey) {
        this.key = crypto.scryptSync(envKey, "salt", this.config.keyLength);
      } else {
        throw new Error(
          "Encryption key not provided. Set ENCRYPTION_KEY environment variable."
        );
      }
    }
  }

  /**
   * Encrypt data
   */
  encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(this.config.ivLength);
      const cipher = crypto.createCipher(this.config.algorithm, this.key);
      cipher.setAAD(Buffer.from("lunarbot", "utf8"));

      let encrypted = cipher.update(data, "utf8", "hex");
      encrypted += cipher.final("hex");

      const tag = cipher.getAuthTag();

      // Combine IV, tag, and encrypted data
      const combined =
        iv.toString("hex") + ":" + tag.toString("hex") + ":" + encrypted;

      return Buffer.from(combined).toString("base64");
    } catch (error) {
      console.error("Encryption error:", error);
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt data
   */
  decrypt(encryptedData: string): string {
    try {
      const combined = Buffer.from(encryptedData, "base64").toString("utf8");
      const parts = combined.split(":");

      if (parts.length !== 3) {
        throw new Error("Invalid encrypted data format");
      }

      const iv = Buffer.from(parts[0], "hex");
      const tag = Buffer.from(parts[1], "hex");
      const encrypted = parts[2];

      const decipher = crypto.createDecipher(this.config.algorithm, this.key);
      decipher.setAAD(Buffer.from("lunarbot", "utf8"));
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, "hex", "utf8");
      decrypted += decipher.final("utf8");

      return decrypted;
    } catch (error) {
      console.error("Decryption error:", error);
      throw new Error("Failed to decrypt data");
    }
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
      Buffer.from(hash, "hex")
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
  salt: string
): boolean {
  const encryptionService = getEncryptionService();
  return encryptionService.verifyHash(password, hash, salt);
}

/**
 * Encrypt user credentials
 */
export function encryptCredentials(
  username: string,
  password: string
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
  encryptedPassword: string
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
