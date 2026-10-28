import { ENV } from './env.js';

const isPrivateIpv4Address = (hostname: string): boolean => {
  const octets = hostname.split('.').map(Number);
  if (
    octets.length !== 4 ||
    octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
  ) {
    return false;
  }

  return octets[0] === 10 ||
    (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) ||
    (octets[0] === 192 && octets[1] === 168);
};

export const isAllowedClientOrigin = (origin?: string): boolean => {
  if (!origin) return true;
  if (
    origin === ENV.CLIENT_URL ||
    origin === 'http://localhost:5173' ||
    origin === 'http://127.0.0.1:5173'
  ) {
    return true;
  }

  if (ENV.NODE_ENV === 'production') return false;

  try {
    const { protocol, hostname } = new URL(origin);
    return protocol === 'http:' &&
      (hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        isPrivateIpv4Address(hostname));
  } catch {
    return false;
  }
};
