import { describe, it, expect } from 'vitest';
import { parseTagNumbers } from './tagScannerEngine';

describe('tagScannerEngine [Dual Barcode & Number OCR Parser]', () => {
  it('extracts 10-digit Cobb product barcode from tag text', () => {
    const text = 'COBB APPAREL \n MRP: 2499 \n 0080727340 \n FSRE4214';
    const result = parseTagNumbers(text);
    expect(result).not.toBeNull();
    expect(result.type).toBe('barcode');
    expect(result.value).toBe('0080727340');
  });

  it('extracts 13-digit Vendor EAN barcode from tag text', () => {
    const text = 'VENDOR TAG \n 8907123456789 \n SIZE: 40';
    const result = parseTagNumbers(text);
    expect(result).not.toBeNull();
    expect(result.type).toBe('barcode');
    expect(result.value).toBe('8907123456789');
  });

  it('extracts Article Code when barcode number is damaged or obscured', () => {
    const text = 'COBB SHIRT \n ART: FSRE4214 \n MENSWEAR';
    const result = parseTagNumbers(text);
    expect(result).not.toBeNull();
    expect(result.type).toBe('article');
    expect(result.value).toBe('FSRE4214');
  });

  it('extracts hyphenated Article Code cleanly', () => {
    const text = 'STYLE: CS-4029 \n SIZE 38';
    const result = parseTagNumbers(text);
    expect(result).not.toBeNull();
    expect(result.type).toBe('article');
    expect(result.value).toBe('CS4029');
  });

  it('returns null on empty or non-matching text', () => {
    expect(parseTagNumbers('')).toBeNull();
    expect(parseTagNumbers('HELLO WORLD NO CODE')).toBeNull();
  });
});

