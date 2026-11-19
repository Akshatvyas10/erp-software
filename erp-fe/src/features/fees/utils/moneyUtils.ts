/**
 * Enterprise Financial / Currency utilities for School ERP
 * Guarantees zero NaN values, strict number coercion, and consistent INR formatting
 */

/**
 * Coerces any raw value (string, number, null, undefined) to a finite number.
 * Defaults to 0 if null, undefined, NaN, or non-finite.
 */
export function toMoney(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Formats any raw numeric value to Indian Rupee standard format (e.g. ₹5,000)
 */
export function formatMoney(value: unknown): string {
  const amount = toMoney(value);
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Formats any raw numeric value to plain locale string (e.g. "5,000") without ₹ symbol
 */
export function formatAmountNumber(value: unknown): string {
  const amount = toMoney(value);
  return amount.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

