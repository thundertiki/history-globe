import { describe, it, expect } from 'vitest';
import { sheetPadding } from '../src/sheet';

describe('sheetPadding', () => {
  it('pads the bottom by the sheet height on phones when open', () => {
    expect(sheetPadding('half', 300, true)).toEqual({ top: 60, bottom: 300, left: 0, right: 0 });
    expect(sheetPadding('full', 500, true)).toEqual({ top: 60, bottom: 500, left: 0, right: 0 });
  });
  it('is zero at peek or when not a phone', () => {
    const zero = { top: 0, bottom: 0, left: 0, right: 0 };
    expect(sheetPadding('peek', 40, true)).toEqual(zero);
    expect(sheetPadding('half', 300, false)).toEqual(zero);
  });
});
