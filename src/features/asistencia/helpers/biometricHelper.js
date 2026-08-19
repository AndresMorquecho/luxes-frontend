// src/features/asistencia/helpers/biometricHelper.js

/**
 * Verifica si el dispositivo (celular/laptop) soporta biometría nativa (Huella Dactilar / Face ID / Touch ID / Windows Hello)
 */
export async function checkBiometricSupport() {
  if (
    typeof window !== 'undefined' &&
    window.PublicKeyCredential &&
    typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
  ) {
    try {
      return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    } catch (e) {
      console.warn('Error al verificar soporte biométrico:', e);
      return false;
    }
  }
  return false;
}

/**
 * Solicita autenticación por Huella Dactilar o Biometría usando la API nativa WebAuthn
 * @param {object} empleado 
 */
export async function requestBiometricScan(empleado) {
  if (!window.PublicKeyCredential) {
    throw new Error('Este dispositivo o navegador no soporta autenticación biométrica.');
  }

  const hostname = window.location.hostname || 'localhost';
  const challenge = new Uint8Array(32);
  window.crypto.getRandomValues(challenge);

  const userIdStr = String(empleado?.id || 'emp-user');
  const userIdBuffer = new Uint8Array(userIdStr.split('').map(c => c.charCodeAt(0)));
  const sanitizedName = (empleado?.nombre || 'empleado')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_');

  const creationOptions = {
    publicKey: {
      rp: {
        name: 'ALUX Control de Asistencia',
        id: hostname,
      },
      user: {
        id: userIdBuffer,
        name: sanitizedName || 'empleado_alux',
        displayName: empleado?.nombre || 'Colaborador ALUX',
      },
      challenge,
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform', // Obliga a usar sensor físico del celular (Huella / Touch ID / Face ID)
        requireResidentKey: false,
        userVerification: 'required',
      },
      timeout: 60000,
      attestation: 'none',
    },
  };

  try {
    // Activa directamente el lector de huella dactilar nativo del teléfono
    const credential = await navigator.credentials.create(creationOptions);
    return { success: true, credential };
  } catch (err) {
    console.error('Error en autenticación biométrica WebAuthn:', err);
    if (err.name === 'NotAllowedError') {
      throw new Error('Escaneo de huella cancelado o denegado por el usuario.');
    }
    // Fallback con passkey si la creación fue rechazada por clave existente
    try {
      const getOptions = {
        publicKey: {
          challenge,
          rpId: hostname,
          userVerification: 'required',
          timeout: 60000,
        },
      };
      const getCred = await navigator.credentials.get(getOptions);
      return { success: true, credential: getCred };
    } catch (getErr) {
      if (getErr.name === 'NotAllowedError') {
        throw new Error('Escaneo de huella cancelado.');
      }
      throw new Error('No se pudo verificar la huella en este dispositivo.');
    }
  }
}
