/**
 * Converts a numeric currency amount into Indian Rupee words.
 * Handles Crores, Lakhs, Thousands, Hundreds, and Paise.
 */
export function amountToWordsIndian(amount: number): string {
  if (!amount || amount === 0) return 'Zero Rupees Only';

  const units = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];

  const tens = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(n: number): string {
    if (n < 20) return units[n];
    const unit = n % 10;
    return `${tens[Math.floor(n / 10)]}${unit ? ' ' + units[unit] : ''}`;
  }

  function convertThreeDigits(n: number): string {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const hundredStr = hundred ? `${units[hundred]} Hundred` : '';
    const restStr = rest ? convertTwoDigits(rest) : '';
    return [hundredStr, restStr].filter(Boolean).join(' ');
  }

  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let remaining = rupees;
  const parts: string[] = [];

  // Crores
  const crores = Math.floor(remaining / 10000000);
  if (crores > 0) {
    parts.push(`${convertTwoDigits(crores)} Crore`);
    remaining %= 10000000;
  }

  // Lakhs
  const lakhs = Math.floor(remaining / 100000);
  if (lakhs > 0) {
    parts.push(`${convertTwoDigits(lakhs)} Lakh`);
    remaining %= 100000;
  }

  // Thousands
  const thousands = Math.floor(remaining / 1000);
  if (thousands > 0) {
    parts.push(`${convertTwoDigits(thousands)} Thousand`);
    remaining %= 1000;
  }

  // Hundreds & units
  if (remaining > 0) {
    parts.push(convertThreeDigits(remaining));
  }

  const rupeeString = parts.length ? `${parts.join(' ')} Rupees` : '';
  const paiseString = paise > 0 ? ` and ${convertTwoDigits(paise)} Paise` : '';

  return `${rupeeString}${paiseString} Only`;
}
