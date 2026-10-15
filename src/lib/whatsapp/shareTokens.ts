import crypto from 'crypto';

// Secret key used for signing document tokens
const SHARE_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'lenden-secure-share-token-secret-key-32b';

export type ShareResourceType = 'INVOICE' | 'RECEIPT' | 'STATEMENT';

export interface ShareTokenPayload {
  resourceType: ShareResourceType;
  resourceId: string;
  businessId: string;
  expiresAt: number; // Unix timestamp in ms
}

/**
 * Generates a tamper-proof HMAC SHA-256 token for authorized customer document sharing.
 * Default expiration is 14 days (336 hours).
 */
export function generateShareToken(
  resourceType: ShareResourceType,
  resourceId: string,
  businessId: string,
  expiresInHours: number = 336
): string {
  const expiresAt = Date.now() + expiresInHours * 60 * 60 * 1000;
  const payloadData = `${resourceType}:${resourceId}:${businessId}:${expiresAt}`;
  
  const hmac = crypto.createHmac('sha256', SHARE_SECRET);
  hmac.update(payloadData);
  const signature = hmac.digest('hex');

  // Format: Base64URL(payload):signature
  const encodedPayload = Buffer.from(payloadData).toString('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Validates a share token and ensures:
 * 1. Signature matches HMAC secret (no tampering)
 * 2. Token has not expired
 * 3. Resource type, resource ID, and business ID match the requested document (tenant isolation)
 */
export function verifyShareToken(
  token: string,
  expectedType: ShareResourceType,
  expectedResourceId: string,
  expectedBusinessId: string
): { isValid: boolean; error?: string; payload?: ShareTokenPayload } {
  if (!token || !token.includes('.')) {
    return { isValid: false, error: 'Malformed or missing access token.' };
  }

  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return { isValid: false, error: 'Invalid token structure.' };
  }

  let payloadData: string;
  try {
    payloadData = Buffer.from(encodedPayload, 'base64url').toString('utf-8');
  } catch {
    return { isValid: false, error: 'Failed to decode token payload.' };
  }

  // Recalculate signature
  const hmac = crypto.createHmac('sha256', SHARE_SECRET);
  hmac.update(payloadData);
  const expectedSignature = hmac.digest('hex');

  // Constant-time comparison to prevent timing attacks
  const isSignatureValid = crypto.timingSafeEqual(
    Buffer.from(providedSignature),
    Buffer.from(expectedSignature)
  );

  if (!isSignatureValid) {
    return { isValid: false, error: 'Invalid token signature. Document access denied.' };
  }

  const parts = payloadData.split(':');
  if (parts.length !== 4) {
    return { isValid: false, error: 'Invalid token payload format.' };
  }

  const [resourceType, resourceId, businessId, expiresAtStr] = parts;
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return { isValid: false, error: 'Document access link has expired.' };
  }

  if (
    resourceType !== expectedType ||
    resourceId !== expectedResourceId ||
    businessId !== expectedBusinessId
  ) {
    return { isValid: false, error: 'Access token does not match requested tenant document.' };
  }

  return {
    isValid: true,
    payload: {
      resourceType: resourceType as ShareResourceType,
      resourceId,
      businessId,
      expiresAt,
    },
  };
}
