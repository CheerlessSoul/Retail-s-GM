import { createWorker } from 'tesseract.js';
import type { OcrExtractedData } from '../types';

/**
 * Intelligent Retail Label OCR & Information Extractor
 */
export async function extractProductDetailsFromImage(
  imageSource: string | File,
  onProgress?: (progress: number, status: string) => void
): Promise<OcrExtractedData> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        const p = Math.round((m.progress || 0) * 100);
        onProgress?.(p, 'Analyzing package label text...');
      } else {
        onProgress?.(20, m.status);
      }
    },
  });

  try {
    onProgress?.(30, 'Performing optical character recognition...');
    const result = await worker.recognize(imageSource);
    const text = result.data.text || '';
    const confidence = result.data.confidence || 0;

    onProgress?.(85, 'Extracting dates, batch, and prices...');
    const parsed = parseRetailLabelText(text);

    return {
      ...parsed,
      rawText: text,
      confidence,
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Smart Regex & Heuristic Parser for Retail Product Labels
 */
export function parseRetailLabelText(rawText: string): Omit<OcrExtractedData, 'rawText' | 'confidence'> {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let expiryDate: string | undefined;
  let mfgDate: string | undefined;
  let batchNumber: string | undefined;
  let mrp: number | undefined;
  let netQty: string | undefined;
  let productName: string | undefined;
  let brand: string | undefined;

  // Month lookup dictionary
  const monthsMap: Record<string, number> = {
    jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
    jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    january: 1, february: 2, march: 3, april: 4, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12
  };

  /**
   * Helper to validate calendar date values including leap years
   */
  const isValidCalendarDate = (year: number, month: number, day: number): boolean => {
    if (year < 2020 || year > 2045) return false;
    if (month < 1 || month > 12) return false;
    const maxDay = new Date(year, month, 0).getDate();
    return day >= 1 && day <= maxDay;
  };

  const formatISO = (y: number, m: number, d: number): string => {
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };

  const normalizeDateToISO = (rawDate: string): string | undefined => {
    try {
      const cleaned = rawDate.replace(/[^\w\s/.-]/g, ' ').trim();

      // 1. Check strict ISO format first (YYYY-MM-DD or YYYY/MM/DD)
      const isoMatch = cleaned.match(/\b(20\d{2})[\/\.-](\d{1,2})[\/\.-](\d{1,2})\b/);
      if (isoMatch) {
        const y = parseInt(isoMatch[1], 10);
        const m = parseInt(isoMatch[2], 10);
        const d = parseInt(isoMatch[3], 10);
        if (isValidCalendarDate(y, m, d)) {
          return formatISO(y, m, d);
        }
      }

      // 2. Check Word Month (e.g. 24 Nov 2026 or Nov 2026)
      const wordMonthMatch = cleaned.match(/\b(?:(\d{1,2})\s+)?([a-zA-Z]{3,9})\s+(20\d{2}|\d{2})\b/i);
      if (wordMonthMatch) {
        const monKey = wordMonthMatch[2].toLowerCase();
        const m = monthsMap[monKey] || Object.entries(monthsMap).find(([k]) => monKey.startsWith(k))?.[1];
        if (m) {
          let y = parseInt(wordMonthMatch[3], 10);
          if (y < 100) y += 2000;
          const maxDay = new Date(y, m, 0).getDate();
          const d = wordMonthMatch[1] ? parseInt(wordMonthMatch[1], 10) : maxDay;
          if (isValidCalendarDate(y, m, d)) {
            return formatISO(y, m, d);
          }
        }
      }

      // 3. Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      const fullDateMatch = cleaned.match(/\b(\d{1,2})[\/\.-](\d{1,2})[\/\.-](20\d{2}|\d{2})\b/);
      if (fullDateMatch) {
        let d = parseInt(fullDateMatch[1], 10);
        let m = parseInt(fullDateMatch[2], 10);
        let y = parseInt(fullDateMatch[3], 10);
        if (y < 100) y += 2000;

        // Auto-correct inverted MM/DD if month > 12 and day <= 12
        if (m > 12 && d <= 12) {
          const temp = d;
          d = m;
          m = temp;
        }

        if (isValidCalendarDate(y, m, d)) {
          return formatISO(y, m, d);
        }
      }

      // 4. Check MM/YYYY or MM/YY
      const monthYearMatch = cleaned.match(/\b(\d{1,2})[\/\.-](20\d{2}|\d{2})\b/);
      if (monthYearMatch) {
        const m = parseInt(monthYearMatch[1], 10);
        let y = parseInt(monthYearMatch[2], 10);
        if (y < 100) y += 2000;
        if (m >= 1 && m <= 12 && y >= 2020 && y <= 2045) {
          // True last day of this specific month (handling leap years correctly!)
          const lastDay = new Date(y, m, 0).getDate();
          return formatISO(y, m, lastDay);
        }
      }
    } catch {
      // return undefined on unparseable format
    }
    return undefined;
  };

  // 1. Scan for Expiry Date
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (
      upper.includes('EXP') ||
      upper.includes('USE BY') ||
      upper.includes('BEST BEFORE') ||
      upper.includes('VALID TILL') ||
      upper.includes('EXPIRE')
    ) {
      const afterKeyword = line.replace(/.*(EXPIRY|EXPIRES|EXPIRE|EXP\.?|USE BY|BEST BEFORE|VALID TILL)[:\s]*/i, '');
      const parsed = normalizeDateToISO(afterKeyword);
      if (parsed) {
        expiryDate = parsed;
        break;
      }
    }
  }

  // Fallback: If no explicit EXP label, scan for standard future date
  if (!expiryDate) {
    for (const line of lines) {
      const match = normalizeDateToISO(line);
      if (match) {
        expiryDate = match;
        break;
      }
    }
  }

  // 2. Scan for Manufacturing Date (MFD / PKD)
  for (const line of lines) {
    const upper = line.toUpperCase();
    if (
      upper.includes('MFD') ||
      upper.includes('MFG') ||
      upper.includes('PACKED') ||
      upper.includes('PKD')
    ) {
      const afterKeyword = line.replace(/.*(MFD|MFG|PACKED ON|PKD)[:\s]*/i, '');
      const parsed = normalizeDateToISO(afterKeyword);
      if (parsed) {
        mfgDate = parsed;
        break;
      }
    }
  }

  // 3. Scan for Batch Number
  for (const line of lines) {
    const match = line.match(/(?:BATCH(?:\s*NO)?|B\.?\s*NO|LOT(?:\s*NO)?|BN)[:\s.]*([A-Za-z0-9\-\/]+)/i);
    if (match && match[1] && match[1].length >= 3) {
      batchNumber = match[1].trim();
      break;
    }
  }

  // 4. Scan for MRP / Price
  for (const line of lines) {
    const match = line.match(/(?:MRP|RS\.?|₹|PRICE)[:\s.]*(\d+(?:\.\d{1,2})?)/i);
    if (match && match[1]) {
      const val = parseFloat(match[1]);
      if (val > 0 && val < 50000) {
        mrp = val;
        break;
      }
    }
  }

  // 5. Scan for Net Quantity / Weight
  for (const line of lines) {
    const match = line.match(/(?:NET\s*(?:WT|QTY|WEIGHT)?[:\s]*)?(\d+(?:\.\d+)?\s*(?:KG|G|GM|GRAMS|L|LTR|ML|PCS|TABLETS|CAPSULES))/i);
    if (match && match[1]) {
      netQty = match[1].trim();
      break;
    }
  }

  // 6. Extract Candidate Product Name
  const candidateLines = lines.filter((l) => {
    const u = l.toUpperCase();
    return (
      !u.includes('EXP') &&
      !u.includes('MFD') &&
      !u.includes('BATCH') &&
      !u.includes('MRP') &&
      !u.includes('NET WT') &&
      !u.includes('INGREDIENTS') &&
      !u.includes('NUTRITIONAL') &&
      l.length >= 3 &&
      l.length <= 60 &&
      !/^\d+$/.test(l)
    );
  });

  if (candidateLines.length > 0) {
    productName = candidateLines[0];
    if (candidateLines.length > 1 && candidateLines[0].length < 15) {
      brand = candidateLines[0];
      productName = `${candidateLines[0]} ${candidateLines[1]}`;
    }
  }

  return {
    productName,
    brand,
    expiryDate,
    mfgDate,
    batchNumber,
    mrp,
    netQty,
  };
}
