/** Escapes user input for safe use inside a RegExp (prevents ReDoS / injection). */
export const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
