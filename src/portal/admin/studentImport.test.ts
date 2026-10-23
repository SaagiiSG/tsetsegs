import { describe, expect, it } from 'vitest';
import { checkStudentRows, failedRowsText, splitRows } from './studentImport';

const ctx = {
  classes: [{ id: 'c1', name: 'SAT Morning' }, { id: 'c2', name: 'IELTS Evening' }],
  students: [{ name: 'Old Student', phone: '88887777' }],
  defaultClassId: null as string | null,
};
const check = (text: string, defaultClassId: string | null = null) => checkStudentRows(text, { ...ctx, defaultClassId });

describe('splitRows', () => {
  it('reads tab-separated rows pasted from a spreadsheet', () => {
    expect(splitRows('Bat\t9911 2233\tSAT Morning\r\nDorj\t99001122\n')).toEqual([['Bat', '9911 2233', 'SAT Morning'], ['Dorj', '99001122']]);
  });

  it('reads comma-separated rows with quotes, escaped quotes and a BOM', () => {
    expect(splitRows('﻿"Bat, Erdene",99112233,"SAT ""A"""\nDorj , 99001122 ,')).toEqual([['Bat, Erdene', '99112233', 'SAT "A"'], ['Dorj', '99001122', '']]);
  });

  it('keeps commas inside cells when the paste uses tabs, and drops blank lines', () => {
    expect(splitRows('\n\nBat, Erdene\t99112233\n\t\t\n   \nDorj\t99001122\n\n')).toEqual([['Bat, Erdene', '99112233'], ['Dorj', '99001122']]);
  });
});

describe('checkStudentRows', () => {
  it('skips a header row and saves phones as digits', () => {
    const rows = check('Name\tPhone\tBatch\nBat\t+976 9911-2233\tsat morning');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: 'Bat', phone: '97699112233', classId: 'c1', error: undefined });
  });

  it('flags missing name, missing phone and bad phones', () => {
    expect(check('\t99112233\nBat\t\nDorj\t12345\nSaraa\t1234567890123456\nTuya\tabc12').map(r => r.error))
      .toEqual(['Missing name', 'Missing phone', 'Bad phone number', 'Bad phone number', 'Bad phone number']);
  });

  it('flags an unknown batch and uses the default batch for rows without one', () => {
    const rows = check('Bat,99112233,Night class\nDorj,99001122\nSaraa,99003344,IELTS Evening', 'c1');
    expect(rows.map(r => r.error)).toEqual(['No batch called "Night class"', undefined, undefined]);
    expect(rows.map(r => r.classId)).toEqual([null, 'c1', 'c2']);
  });

  it('flags repeated phones in the list and phones already in this center, compared as digits', () => {
    const rows = check('Bat\t9911-2233\nBat again\t99112233\nOld\t8888 7777\nBad\t\n\t99001122\nDorj\t99001122');
    expect(rows.map(r => r.error)).toEqual([undefined, 'Same phone as row 1', 'Already added as Old Student', 'Missing phone', 'Missing name', undefined]);
  });

  it('copies failed rows so they can be pasted back in', () => {
    const failed = check('Bat\t12\tSAT Morning').filter(r => r.error);
    const text = failedRowsText(failed);
    expect(text).toBe('Bat\t12\tSAT Morning\tBad phone number');
    expect(check(text)[0]).toMatchObject({ name: 'Bat', rawPhone: '12', batch: 'SAT Morning' });
  });
});
