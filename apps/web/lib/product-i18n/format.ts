export type MessageValues = Record<string, string | number>;

/** Replace named placeholders such as `{count}` without evaluating markup. */
export function formatMessage(template: string, values: MessageValues): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match,
  );
}
