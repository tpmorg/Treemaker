interface Secrets {
  apiKey: string;
  databaseUrl: string;
  stripeSecret: string;
  awsRegion: string;
}

type Environment = 'development' | 'staging' | 'production';

function getRequiredEnvVar(key: string): string {
  // With Vite, we access env vars through import.meta.env
  const value = import.meta.env[`VITE_${key}`];
  if (!value) {
    throw new Error(
      `Missing required environment variable: VITE_${key}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }
  return value;
}

export function loadSecrets(): Secrets {
  // Load all secrets at once - fail fast if any are missing
  const secrets: Secrets = {
    apiKey: getRequiredEnvVar('API_KEY'),
    databaseUrl: getRequiredEnvVar('DATABASE_URL'),
    stripeSecret: getRequiredEnvVar('STRIPE_SECRET'),
    awsRegion: getRequiredEnvVar('AWS_REGION'),
  };

  return secrets;
}