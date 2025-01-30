import type { Environment } from 'vite';
import { loadSecrets } from './secrets';

interface Config {
  env: Environment;
  isDebugEnabled: boolean;
  secrets: Secrets;
}

function determineEnvironment(): Environment {
  const mode = import.meta.env.MODE as Environment;
  if (!mode || !['development', 'staging', 'production'].includes(mode)) {
    return 'development';
  }
  return mode;
}

// Initialize config once at startup
export const config: Config = {
  env: determineEnvironment(),
  isDebugEnabled: import.meta.env.VITE_DEBUG === 'true',
  secrets: loadSecrets(),
};