export function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToBuffer(base64) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const PASSKEY_STORAGE_KEY = 'cobb_passkey_enrolled';

export function getEnrolledPasskey() {
  try {
    const data = localStorage.getItem(PASSKEY_STORAGE_KEY);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    return null;
  }
}

export function clearEnrolledPasskey() {
  try {
    localStorage.removeItem(PASSKEY_STORAGE_KEY);
  } catch (e) {}
}

export async function isBiometricAvailable() {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registerDeviceBiometrics(user) {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometric authentication is not supported on this device or browser.');
  }

  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userId = new TextEncoder().encode(user.username);

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: {
        name: 'Cobb Store CRM',
        id: window.location.hostname
      },
      user: {
        id: userId,
        name: user.username,
        displayName: user.name || user.username
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'discouraged'
      },
      timeout: 60000,
      attestation: 'none'
    }
  });

  if (!credential) {
    throw new Error('Failed to create biometric passkey.');
  }

  const rawIdBase64 = bufferToBase64(credential.rawId);
  const enrolledData = {
    username: user.username,
    name: user.name || user.username,
    role: user.role || 'owner',
    rawId: rawIdBase64,
    registeredAt: new Date().toISOString()
  };

  localStorage.setItem(PASSKEY_STORAGE_KEY, JSON.stringify(enrolledData));
  return enrolledData;
}

export async function authenticateWithBiometrics() {
  if (!window.PublicKeyCredential) {
    throw new Error('Biometric authentication is not supported on this device.');
  }

  const enrolled = getEnrolledPasskey();
  if (!enrolled) {
    throw new Error('No passkey is registered on this device. Please set up Biometrics first in your profile.');
  }
  
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const getOptions = {
    challenge,
    userVerification: 'required',
    timeout: 60000
  };

  if (enrolled?.rawId) {
    getOptions.allowCredentials = [{
      type: 'public-key',
      id: base64ToBuffer(enrolled.rawId),
      transports: ['internal']
    }];
  }

  const assertion = await navigator.credentials.get({
    publicKey: getOptions
  });

  return { assertion, enrolledUser: enrolled };
}
