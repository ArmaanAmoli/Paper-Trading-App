import { describe, expect, it } from 'vitest';
import { indicatorConfigs } from './indicatorConfigs';

describe('indicatorConfigs', () => {
  it('defines a configuration for every supported indicator', () => {
    expect(Object.keys(indicatorConfigs).sort()).toEqual(['BBAND', 'RSI', 'SMA', 'STOCH', 'VOL']);
  });

  it('gives every indicator an id, title and submit label', () => {
    Object.entries(indicatorConfigs).forEach(([key, config]) => {
      expect(config.indicatorId).toBe(key);
      expect(config.title).not.toBe('');
      expect(config.submitLabel).not.toBe('');
    });
  });

  it('gives every field a name, label, type and default value', () => {
    Object.values(indicatorConfigs).forEach((config) => {
      expect(config.fields.length).toBeGreaterThan(0);

      config.fields.forEach((field) => {
        expect(field.name).not.toBe('');
        expect(field.label).not.toBe('');
        expect(['number', 'color', 'select']).toContain(field.type);
        expect(field).toHaveProperty('defaultValue');
      });
    });
  });

  it('provides options for every select field', () => {
    Object.values(indicatorConfigs).forEach((config) => {
      config.fields
        .filter((field) => field.type === 'select')
        .forEach((field) => {
          expect(field.options?.length ?? 0).toBeGreaterThan(0);
        });
    });
  });

  it('transforms the SMA fields into the indicator payload', () => {
    const transform = indicatorConfigs.SMA.transform;
    expect(transform).toBeDefined();

    const result = transform?.({
      timeperiod: '20',
      lineColor: '#FF0000',
      typeOfMA: 'EMA',
    });

    expect(result).toEqual({ indicator: 'EMA', timeperiod: 20, lineColor: '#FF0000' });
  });

  it('transforms the BBAND fields into the indicator payload', () => {
    const transform = indicatorConfigs.BBAND.transform;
    expect(transform).toBeDefined();

    const result = transform?.({
      timeperiod: '20',
      stdUp: '2',
      stdDown: '3',
      typeOfMA: 'EMA',
      lineColor: '#111111',
      upLineColor: '#222222',
      downLineColor: '#333333',
    });

    expect(result).toEqual({
      stdUp: 2,
      stdDown: 3,
      matype: 1,
      timeperiod: 20,
      lineColor: '#111111',
      upLineColor: '#222222',
      downLineColor: '#333333',
    });
  });

  it('transforms the RSI fields into the indicator payload', () => {
    const transform = indicatorConfigs.RSI.transform;
    expect(transform).toBeDefined();

    const result = transform?.({
      timeperiod: '14',
      lineColor: '#FFEB3B',
      overBroughtLevel: '70',
      overSoldLevel: '30',
    });

    expect(result).toEqual({
      timeperiod: 14,
      lineColor: '#FFEB3B',
      overBroughtLevel: 70,
      overSoldLevel: 30,
    });
  });

  it('transforms the STOCH fields into the indicator payload', () => {
    const transform = indicatorConfigs.STOCH.transform;
    expect(transform).toBeDefined();

    const result = transform?.({
      timeperiod: '14',
      fastPeriod: '5',
      slowkPeriod: '3',
      slowkMaType: 'EMA',
      slowdPeriod: '3',
      slowdMaType: 'SMA',
      slowLineColor: '#FF9D23',
      fastLineColor: '#EA5252',
    });

    expect(result).toEqual({
      fastPeriod: 5,
      slowkPeriod: 3,
      slowkMatype: 1,
      slowdPeriod: 3,
      slowdMatype: 0,
      timeperiod: 14,
      slowLineColor: '#FF9D23',
      fastLineColor: '#EA5252',
    });
  });

  it('transforms the VOL fields into the indicator payload', () => {
    const transform = indicatorConfigs.VOL.transform;
    expect(transform).toBeDefined();

    const result = transform?.({ typeOfVol: 'OBV', lineColor: '#2196F3' });

    expect(result).toEqual({ indicator: 'OBV', lineColor: '#2196F3' });
  });
});
