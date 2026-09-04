export function getRandomString(length: number) {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';

  for (let i = length; i > 0; --i) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }

  return result;
}

export function toArrayBuffer<T>(obj: T): ArrayBuffer {
  const json = JSON.stringify(obj);

  return new TextEncoder().encode(json).buffer;
}

export function toObject<T>(buf: ArrayBuffer): T {
  const txt = new TextDecoder().decode(new Uint8Array(buf));

  return JSON.parse(txt);
}
