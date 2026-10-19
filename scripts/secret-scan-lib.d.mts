export interface SecretFinding {
  label: string;
  path: string;
  index: number;
}

export function scanText(content: string, path?: string): SecretFinding[];
