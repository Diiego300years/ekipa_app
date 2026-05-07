function clean(value: string | undefined) {
  return value?.trim() || undefined;
}

export function getVapidPublicKey() {
  return clean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) ?? null;
}
