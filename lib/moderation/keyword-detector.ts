/**
 * Regex-based keyword detection for comment moderation.
 * Used for both delete (negative/offensive) and spam detection.
 */

// ── Default Patterns (extracted from the original n8n flows) ─────────────────

export const DEFAULT_DELETE_PATTERNS: string[] = [
  // Size complaints
  'no cabe nada', 'no cabe ni', 'lote', 'no cabemos', 'no caben los muebles',
  'no cabe la cama', 'no cabe el sofá', 'eso no es para una familia',
  // Price complaints
  'cuesta mucho', 'cuesta un ojo', 'demasiado caro', 'muy caro', 'carísimo',
  'carisimo', 'no vale lo que cobran', 'no vale la pena', 'pérdida de plata',
  'perdida de plata', 'tirar la plata', 'botar la plata', 'mal negocio',
  'pésima inversión', 'mala inversión',
  // Derogatory names for the space
  'caja de', 'cajita de', 'casa de muñeca', 'casa de juguete', 'cuartucho',
  'chiribitil', 'pocilga', 'tugurio', 'cambuche', 'conejera', 'palomar',
  'celda', 'gallinero', 'chiviado', 'hueco',
  // Fraud accusations
  'estafadores', 'estafando', 'estafa', 'timadores', 'timando', 'timo',
  'engañando', 'engañadores', 'publicidad engañosa', 'mentirosos', 'mentira',
  'falso', 'fraude', 'fraudulentos', 'corrupto',
  // Profanity (Colombian slang included)
  'hijueputa', 'hpt', 'malparido', 'malparida', 'gonorrea', 'careculo',
  'pirobo', 'piroba', 'put[ao]', 'mierda', 'cabr[oó]n', 'pendej[ao]',
  'imbec[ií]l', 'idiota', 'estupid[ao]', 'ladr[oó]n', 'ladrones',
  // Threats
  'matar', 'muerte', 'mueran', 'violar', 'violadores', 'amenaza',
  'desgraciado', 'miserable',
  // Quality complaints
  'mal acabado', 'mal terminado', 'mala calidad', 'materiales baratos',
  'materiales malos', 'se cae a pedazos', 'pésimo', 'pesimo', 'desastre',
  'basura', 'porquería', 'chatarra', 'ruinas',
  // Size/space complaints
  'muy pequeño', 'diminuto', 'microscópico', 'minúsculo', 'enano',
  'sin espacio', 'sin aire', 'sin ventilaci', 'sin luz',
  // Legal/compliance issues
  'sin escrituras', 'sin título', 'sin legalizar', 'incumplidos',
  'no entregan', 'no cumplen', 'demoran', 'demorados',
  // Structural problems
  'grietas', 'humedad', 'goteras', 'plagas', 'cucarachas', 'ratones',
  // Neighborhood issues
  'inseguro', 'peligroso el barrio', 'zona peligrosa', 'barrio peligroso',
  'barrio malo', 'mala zona', 'lejos de todo', 'sin vías',
  // Discouraging others
  'no compren', 'no compres', 'no se les ocurra', 'aléjense', 'alejense',
  'los van a robar', 'los van a estafar', 'no caigan', 'no se dejen',
  // Company attacks
  'voy a denunciar', 'esto es un engaño', 'esto es una estafa',
  'no recomiendo', 'no los recomiendo', 'pésimo servicio', 'mal servicio',
  'no responden', 'no contestan', 'nos estafaron', 'nos robaron',
  'nos engañaron', 'dinero perdido', 'plata perdida', 'perdí mi plata',
  'ojalá quiebren', 'que quiebren', 'empresa corrupta', 'empresa fraudulenta',
  'se robaron el dinero',
];

export const DEFAULT_SPAM_PATTERNS: string[] = [
  'spam', 'viagra', 'cialis', 'casino', 'bit\\.ly', 'tinyurl',
  'click\\s*aqu[ií]', 'gana\\s*dinero', 'xxx', 'porn',
  'f[o0]ll[o0]w\\s*(me|back)', 'compra\\s*ya', 'sorteo', 'regalo',
  'telegram', 'onlyfans', 'crypto', 'bitcoin', 'nft',
  // External URLs (not from Facebook/Instagram)
  'http[s]?:\\/\\/(?!.*(facebook|instagram))',
];

// ── Detection Functions ───────────────────────────────────────────────────────

/**
 * Compile an array of regex patterns into a single combined RegExp.
 * Returns null if the patterns array is empty.
 */
export function buildRegex(patterns: string[]): RegExp | null {
  if (patterns.length === 0) return null;
  const combined = patterns.map(p => `(${p})`).join('|');
  return new RegExp(combined, 'i');
}

/**
 * Test whether a text matches any of the given regex patterns.
 */
export function matchesKeywords(text: string, patterns: string[]): boolean {
  if (patterns.length === 0) return false;
  const regex = buildRegex(patterns);
  if (!regex) return false;
  return regex.test(text);
}

/**
 * Test a single regex pattern against text.
 * Returns false if the pattern is an invalid regex — used in the rules editor preview.
 */
export function testPattern(pattern: string, text: string): boolean {
  try {
    const regex = new RegExp(pattern, 'i');
    return regex.test(text);
  } catch {
    return false; // Invalid regex — treat as no-match
  }
}
