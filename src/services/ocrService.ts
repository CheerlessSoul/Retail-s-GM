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
  const monthsMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    january: '01', february: '02', march: '03', april: '04', june: '06',
    july: '07', august: '08', september: '09', october: '10', november: '11', december: '12'
  };

  const normalizeDateToISO = (rawDate: string): string | undefined => {
    try {
      const cleaned = rawDate.replace(/[^\w\s/.-]/g, ' ').trim();

      // Check Word Month (e.g. 24 Nov 2026 or Nov 2026)
      const wordMonthMatch = cleaned.match(/(\d{1,2})?\s*([a-zA-Z]{3,9})\s*(\d{2,4})/);
      if (wordMonthMatch) {
        const day = wordMonthMatch[1] ? wordMonthMatch[1].padStart(2, '0') : '28';
        const monKey = wordMonthMatch[2].toLowerCase();
        let year = wordMonthMatch[3];
        if (year.length === 2) year = `20${year}`;
        const monthNum = monthsMap[monKey] || Object.keys(monthsMap).find(k => monKey.startsWith(k)) && monthsMap[monKey.slice(0, 3)];
        if (monthNum && Number(year) >= 2020 && Number(year) <= 2040) {
          return `${year}-${monthNum}-${day}`;
        }
      }

      // Check DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
      const fullDateMatch = cleaned.match(/(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/);
      if (fullDateMatch) {
        let day = fullDateMatch[1].padStart(2, '0');
        let month = fullDateMatch[2].padStart(2, '0');
        let year = fullDateMatch[3];
        if (year.length === 2) year = `20${year}`;

        // Validate values
        const nMonth = parseInt(month, 10);
        const nDay = parseInt(day, 10);
        if (nMonth > 12 && nDay <= 12) {
          // Swap day and month if inverted
          const temp = day;
          day = month;
          month = temp;
        }

        if (parseInt(month, 10) >= 1 && parseInt(month, 10) <= 12 && Number(year) >= 2020 && Number(year) <= 2040) {
          return `${year}-${month}-${day}`;
        }
      }

      // Check MM/YYYY or MM/YY
      const monthYearMatch = cleaned.match(/(\d{1,2})[\/\.-](\d{2,4})/);
      if (monthYearMatch) {
        const month = monthYearMatch[1].padStart(2, '0');
        let year = monthYearMatch[2];
        if (year.length === 2) year = `20${year}`;
        const nMonth = parseInt(month, 10);
        if (nMonth >= 1 && nMonth <= 12 && Number(year) >= 2020 && Number(year) <= 2040) {
          // Default to end of month for MM/YY expiry
          return `${year}-${month}-28`;
        }
      }
    } catch {
      // return undefined
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
      // Extract string following the keyword
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
  // Usually the top non-code line or line before packaging details
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
