import Papa from 'papaparse';

export type ParsedMember = {
  area: string;
  company: string;
  role: string;
  name: string;
  shikiten: boolean;
  konzin_table: number;
  biko: string;
  meishi: string;
  tokui: boolean;
};

// 期待するヘッダー: 地域, 会社名, 役職, 氏名, 式典, 懇親会, 備考, 名刺交換, 得意先
export function parseCSV(text: string): ParsedMember[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = result.data;
  if (rows.length < 2) return [];

  const members: ParsedMember[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    if (!cols || !cols[3] || !cols[3].trim()) continue;

    const konzinRaw = (cols[5] || '').trim();
    const konzin = konzinRaw === '×' || konzinRaw === '' ? 0 : parseInt(konzinRaw, 10) || 0;

    members.push({
      area: (cols[0] || '').trim(),
      company: (cols[1] || '').trim(),
      role: (cols[2] || '').trim(),
      name: (cols[3] || '').trim(),
      shikiten: (cols[4] || '').trim() !== '×',
      konzin_table: konzin,
      biko: (cols[6] || '').trim(),
      meishi: (cols[7] || '').trim() === '済' ? '済' : '未',
      tokui: (cols[8] || '').trim() === '○' || (cols[8] || '').trim() === '1',
    });
  }
  return members;
}
