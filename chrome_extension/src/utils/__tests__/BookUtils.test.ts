import { cleanBookTitle } from '../BookUtils';

// A missed prefix makes the Goodreads search return 0 results,
// so each prefix family has its own tests.
describe('cleanBookTitle', () => {
  describe('titles without a prefix', () => {
    test.each([
      '原子習慣',
      'Atomic Habits',
      '深度工作力：淺薄時代的專注力',
    ])('keeps "%s" unchanged', (title) => {
      expect(cleanBookTitle(title)).toBe(title);
    });

    test('trims surrounding whitespace', () => {
      expect(cleanBookTitle('  原子習慣  ')).toBe('原子習慣');
    });

    test('returns an empty string for an empty title', () => {
      expect(cleanBookTitle('')).toBe('');
    });
  });

  describe('Kobo prefix', () => {
    test('removes "Kobo " before the title', () => {
      expect(cleanBookTitle('Kobo 原子習慣')).toBe('原子習慣');
    });

    test('removes "Kobo" without a space', () => {
      expect(cleanBookTitle('Kobo原子習慣')).toBe('原子習慣');
    });

    test('keeps "Kobo" in the middle of a title', () => {
      expect(cleanBookTitle('Using Kobo Readers')).toBe('Using Kobo Readers');
    });
  });

  describe('HyRead prefix', () => {
    test('removes "HyRead " before the title', () => {
      expect(cleanBookTitle('HyRead 原子習慣')).toBe('原子習慣');
    });

    test('removes "HyRead" without a space', () => {
      expect(cleanBookTitle('HyRead原子習慣')).toBe('原子習慣');
    });
  });

  describe('Readmoo prefix', () => {
    test('removes "Readmoo 讀墨 " before the title', () => {
      expect(cleanBookTitle('Readmoo 讀墨 原子習慣')).toBe('原子習慣');
    });

    test('removes "Readmoo讀墨" without spaces', () => {
      expect(cleanBookTitle('Readmoo讀墨原子習慣')).toBe('原子習慣');
    });
  });

  describe('e-book prefixes and suffixes', () => {
    test('removes the full-width "（Pubu電子書）" suffix', () => {
      expect(cleanBookTitle('原子習慣（Pubu電子書）')).toBe('原子習慣');
    });

    test('removes "讀墨電子書" after the title', () => {
      expect(cleanBookTitle('原子習慣 讀墨電子書')).toBe('原子習慣');
    });

    test('removes "（讀墨電子書）" in full-width brackets', () => {
      expect(cleanBookTitle('原子習慣（讀墨電子書）')).toBe('原子習慣');
    });

    test('removes a trailing "電子書"', () => {
      expect(cleanBookTitle('原子習慣 電子書')).toBe('原子習慣');
    });

    test('removes a leading "電子書"', () => {
      expect(cleanBookTitle('電子書 原子習慣')).toBe('原子習慣');
    });

    test('removes "（電子書）" in full-width brackets', () => {
      expect(cleanBookTitle('原子習慣（電子書）')).toBe('原子習慣');
    });

    test('removes "(電子書)" in half-width brackets', () => {
      expect(cleanBookTitle('原子習慣(電子書)')).toBe('原子習慣');
    });

    test('removes a retailer prefix and an e-book suffix together', () => {
      expect(cleanBookTitle('Kobo 原子習慣（電子書）')).toBe('原子習慣');
    });
  });

  describe('bracket removal', () => {
    test('removes full-width parentheses and their content', () => {
      expect(cleanBookTitle('原子習慣（暢銷新版）')).toBe('原子習慣');
    });

    test('removes lenticular brackets and their content', () => {
      expect(cleanBookTitle('【限量】原子習慣')).toBe('原子習慣');
    });

    test('removes half-width parentheses and their content', () => {
      expect(cleanBookTitle('Atomic Habits (Special Edition)')).toBe('Atomic Habits');
    });

    test('removes several bracket groups in one title', () => {
      expect(cleanBookTitle('【限量】原子習慣（新版）(附贈書籤)')).toBe('原子習慣');
    });
  });

  describe('PChome reading list titles', () => {
    test('removes text up to "今日…書單"', () => {
      expect(cleanBookTitle('今日精選書單原子習慣')).toBe('原子習慣');
    });
  });

  describe('known problems', () => {
    // The Kobo rule has no word boundary, so it also cuts titles
    // that start with letters "Kobo" such as "Kobolds". Not fixed here.
    test.failing('keeps a title that only starts with the letters "Kobo"', () => {
      expect(cleanBookTitle('Kobolds Ate My Baby')).toBe('Kobolds Ate My Baby');
    });
  });
});
