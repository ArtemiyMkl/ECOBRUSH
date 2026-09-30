function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function supabaseEnv() {
  return {
    url: required("NEXT_PUBLIC_SUPABASE_URL"),
    key: required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  };
}
