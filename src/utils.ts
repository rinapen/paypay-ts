import { randomBytes } from 'crypto';
import { DeviceHeaders } from './types';

// Proof Key for Code Exchange
export class PKCE {
  static generateCodeVerifier(length: number = 43): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  static async generateCodeChallenge(codeVerifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    return base64;
  }

  static async generatePKCEPair(length: number = 43): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const codeVerifier = this.generateCodeVerifier(length);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    return { codeVerifier, codeChallenge };
  }
}

export function generateVector(r1: [number, number], r2: [number, number], r3: [number, number], precision: number = 8): string {
  const v1 = (Math.random() * (r1[1] - r1[0]) + r1[0]).toFixed(precision);
  const v2 = (Math.random() * (r2[1] - r2[0]) + r2[0]).toFixed(precision);
  const v3 = (Math.random() * (r3[1] - r3[0]) + r3[0]).toFixed(precision);
  return `${v1}_${v2}_${v3}`;
}

export function generateDeviceState(): DeviceHeaders {
  const device_orientation = generateVector(
    [2.2, 2.6],
    [-0.2, -0.05],
    [-0.05, 0.1]
  );
  const device_orientation_2 = generateVector(
    [2.0, 2.6],
    [-0.2, -0.05],
    [-0.05, 0.2]
  );
  const device_rotation = generateVector(
    [-0.8, -0.6],
    [0.65, 0.8],
    [-0.12, -0.04]
  );
  const device_rotation_2 = generateVector(
    [-0.85, -0.4],
    [0.53, 0.9],
    [-0.15, -0.03]
  );
  const device_acceleration = generateVector(
    [-0.35, 0.0],
    [-0.01, 0.3],
    [-0.1, 0.1]
  );
  const device_acceleration_2 = generateVector(
    [0.01, 0.04],
    [-0.04, 0.09],
    [-0.03, 0.1]
  );

  return {
    device_orientation,
    device_orientation_2,
    device_rotation,
    device_rotation_2,
    device_acceleration,
    device_acceleration_2
  };
}

export function updateHeaderDeviceState(headers: Record<string, string>): Record<string, string> {
  const deviceState = generateDeviceState();
  headers["Device-Orientation"] = deviceState.device_orientation;
  headers["Device-Orientation-2"] = deviceState.device_orientation_2;
  headers["Device-Rotation"] = deviceState.device_rotation;
  headers["Device-Rotation-2"] = deviceState.device_rotation_2;
  headers["Device-Acceleration"] = deviceState.device_acceleration;
  headers["Device-Acceleration-2"] = deviceState.device_acceleration_2;
  return headers;
}
