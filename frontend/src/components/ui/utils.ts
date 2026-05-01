type ClassValue = false | null | undefined | string

export function cx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
