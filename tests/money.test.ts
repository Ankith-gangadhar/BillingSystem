import { describe, it, expect } from 'vitest';
import { formatPaise, parsePaise } from '../src/utils/formatters';

describe('Financial Calculations & Money Representation (Integer Paise)', () => {
  it('should format integer paise to Indian Rupee string correctly', () => {
    expect(formatPaise(10000)).toBe('₹100.00');
    expect(formatPaise(6550)).toBe('₹65.50');
    expect(formatPaise(75)).toBe('₹0.75');
    expect(formatPaise(0)).toBe('₹0.00');
    expect(formatPaise(123456789)).toBe('₹12,34,567.89');
  });

  it('should parse rupee inputs accurately into integer paise', () => {
    expect(parsePaise('100.00')).toBe(10000);
    expect(parsePaise('65.50')).toBe(6550);
    expect(parsePaise('₹ 85.00')).toBe(8500);
    expect(parsePaise(45.25)).toBe(4525);
  });

  it('should prevent floating-point accumulation drift', () => {
    // 0.1 + 0.2 in standard float = 0.30000000000000004
    // In integer paise: 10 + 20 = 30 paise
    const p1 = parsePaise('0.10');
    const p2 = parsePaise('0.20');
    expect(p1 + p2).toBe(30);
  });
});
