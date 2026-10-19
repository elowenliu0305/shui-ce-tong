export const secretPatterns = [
  { label: "OpenAI-style secret", regex: /\bsk-[A-Za-z0-9_-]{16,}\b/g },
  { label: "Supabase secret key", regex: /\bsb_secret_[A-Za-z0-9_-]{20,}\b/g },
  {
    label: "Supabase service-role value",
    regex: /\bSUPABASE_SERVICE_ROLE_KEY\b\s*[:=]\s*["'][^"'\r\n]{16,}["']/g,
  },
  {
    label: "embedded API key",
    regex: /\b(?:MODEL|EMBEDDING|OPENAI|DASHSCOPE)_API_KEY\b\s*[:=]\s*["'][A-Za-z0-9_./+=-]{16,}["']/g,
  },
  { label: "embedded demo password", regex: /TaxDemo\d+!?/g },
  { label: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
];

export function scanText(content, path = "<memory>") {
  return secretPatterns.flatMap(({ label, regex }) => {
    regex.lastIndex = 0;
    const matches = [...content.matchAll(regex)];
    regex.lastIndex = 0;
    return matches.map((match) => ({ label, path, index: match.index ?? 0 }));
  });
}
