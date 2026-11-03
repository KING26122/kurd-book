import { x25519 } from '@noble/curves/ed25519';
import { xchacha20poly1305 } from '@noble/ciphers/chacha';
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';
import { randomBytes } from '@noble/hashes/utils';
import { api } from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import type { DecodedMessagePayload, User } from '@/types';

export interface Identity {
  privateKey: string;
  publicKey: string;
  createdAt: string;
  version: 1;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function storageKey(userId: string) {
  return `kurdbook_identity_${userId}`;
}

export function generateIdentity(): Identity {
  const privateKey = x25519.utils.randomSecretKey();
  const publicKey = x25519.getPublicKey(privateKey);
  return {
    privateKey: bytesToBase64(privateKey),
    publicKey: bytesToBase64(publicKey),
    createdAt: new Date().toISOString(),
    version: 1,
  };
}

export function loadIdentity(userId: string): Identity | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Identity;
    if (!parsed.privateKey || !parsed.publicKey || parsed.version !== 1) return null;
    const derived = bytesToBase64(x25519.getPublicKey(base64ToBytes(parsed.privateKey)));
    if (derived !== parsed.publicKey) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveIdentity(userId: string, identity: Identity): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(identity));
}

export function deleteIdentity(userId: string): void {
  localStorage.removeItem(storageKey(userId));
}

/**
 * Returns the device identity key, creating & publishing one if needed.
 * Kurd Book uses one identity per device (device-local, exportable).
 */
export async function ensureIdentity(user: User): Promise<Identity> {
  let identity = loadIdentity(user.id);
  if (!identity) {
    identity = generateIdentity();
    saveIdentity(user.id, identity);
  }

  if (user.publicKey !== identity.publicKey) {
    await api('/api/users/me/identity-key', {
      method: 'POST',
      body: { publicKey: identity.publicKey },
    });
    useAuthStore.getState().patchUser({ publicKey: identity.publicKey });
  }
  return identity;
}

function deriveConversationKey(
  ownPrivateKey: string,
  peerPublicKey: string,
  salt: Uint8Array,
  conversationId: string,
): Uint8Array {
  const shared = x25519.getSharedSecret(
    base64ToBytes(ownPrivateKey),
    base64ToBytes(peerPublicKey),
  );
  return hkdf(
    sha256,
    shared,
    salt,
    encoder.encode(`kurdbook:e2ee:v1:${conversationId}`),
    32,
  );
}

function aadFor(conversationId: string): Uint8Array {
  return encoder.encode(`kurdbook|v1|${conversationId}`);
}

export function encryptPayload(
  payload: DecodedMessagePayload,
  ownPrivateKey: string,
  peerPublicKey: string,
  conversationId: string,
): { ciphertext: string; nonce: string; salt: string } {
  const salt = randomBytes(16);
  const nonce = randomBytes(24);
  const key = deriveConversationKey(ownPrivateKey, peerPublicKey, salt, conversationId);
  const plaintext = encoder.encode(JSON.stringify(payload));
  const cipher = xchacha20poly1305(key, nonce, aadFor(conversationId));
  const ciphertext = cipher.encrypt(plaintext);
  return {
    ciphertext: bytesToBase64(ciphertext),
    nonce: bytesToBase64(nonce),
    salt: bytesToBase64(salt),
  };
}

export function decryptPayload(
  message: { ciphertext: string; nonce: string; salt: string },
  ownPrivateKey: string,
  peerPublicKey: string,
  conversationId: string,
): DecodedMessagePayload | null {
  try {
    const key = deriveConversationKey(
      ownPrivateKey,
      peerPublicKey,
      base64ToBytes(message.salt),
      conversationId,
    );
    const cipher = xchacha20poly1305(key, base64ToBytes(message.nonce), aadFor(conversationId));
    const plaintext = cipher.decrypt(base64ToBytes(message.ciphertext));
    const parsed = JSON.parse(decoder.decode(plaintext)) as DecodedMessagePayload;
    return parsed;
  } catch {
    return null;
  }
}

export async function encryptFile(
  file: Blob,
): Promise<{ blob: Blob; key: string; nonce: string }> {
  const key = randomBytes(32);
  const nonce = randomBytes(24);
  const data = new Uint8Array(await file.arrayBuffer());
  const cipher = xchacha20poly1305(key, nonce);
  const encrypted = cipher.encrypt(data);
  return {
    blob: new Blob([encrypted.slice().buffer], { type: 'application/octet-stream' }),
    key: bytesToBase64(key),
    nonce: bytesToBase64(nonce),
  };
}

export async function decryptFile(
  encrypted: Blob,
  keyB64: string,
  nonceB64: string,
): Promise<Blob> {
  const data = new Uint8Array(await encrypted.arrayBuffer());
  const cipher = xchacha20poly1305(base64ToBytes(keyB64), base64ToBytes(nonceB64));
  const decrypted = cipher.decrypt(data);
  return new Blob([decrypted.slice().buffer]);
}

export function exportIdentity(identity: Identity, user: User): string {
  return JSON.stringify(
    {
      app: 'kurdbook',
      version: 1,
      userId: user.id,
      username: user.username,
      publicKey: identity.publicKey,
      privateKey: identity.privateKey,
      createdAt: identity.createdAt,
    },
    null,
    2,
  );
}

export function validateIdentityBackup(
  raw: string,
  user: User,
): { identity: Identity; matchesUser: boolean } {
  const parsed = JSON.parse(raw) as {
    app?: string;
    version?: number;
    userId?: string;
    publicKey?: string;
    privateKey?: string;
    createdAt?: string;
  };
  if (parsed.app !== 'kurdbook' || parsed.version !== 1 || !parsed.privateKey || !parsed.publicKey) {
    throw new Error('فایلی کلیلی پاراستن دروست نییە.');
  }
  const derived = bytesToBase64(x25519.getPublicKey(base64ToBytes(parsed.privateKey)));
  if (derived !== parsed.publicKey) {
    throw new Error('کلیلەکە دروست نییە یان تێکچووە.');
  }
  return {
    identity: {
      privateKey: parsed.privateKey,
      publicKey: parsed.publicKey,
      createdAt: parsed.createdAt || new Date().toISOString(),
      version: 1,
    },
    matchesUser: parsed.userId === user.id,
  };
}

export async function publishIdentity(userId: string, identity: Identity): Promise<void> {
  saveIdentity(userId, identity);
  await api('/api/users/me/identity-key', {
    method: 'POST',
    body: { publicKey: identity.publicKey },
  });
  useAuthStore.getState().patchUser({ publicKey: identity.publicKey });
}
