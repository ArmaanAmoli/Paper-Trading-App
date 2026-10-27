export interface IndicatorField {
  name: string;
  label: string;
  type: 'number' | 'color' | 'select' | 'text';
  defaultValue: unknown;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  placeholder?: string;
  errorMessage?: string;
  options?: Array<{ value: string; label: string }>;
  conditional?: (values: Record<string, unknown>) => boolean;
}

export interface IndicatorConfig {
  indicatorId: string;
  title: string;
  submitLabel: string;
  fields: IndicatorField[];
  transform?: (values: Record<string, unknown>) => Record<string, unknown>;
}

export type TransformFn = (values: Record<string, unknown>) => Record<string, unknown>;

export const indicatorConfigs: Record<string, IndicatorConfig> = {
  SMA: {
    indicatorId: 'SMA',
    title: 'Moving Average',
    submitLabel: 'Add',
    fields: [
      {
        name: 'timeperiod',
        label: 'Timeperiod',
        type: 'number',
        defaultValue: 14,
        min: 1,
        max: 200,
        step: 1,
        required: true,
        placeholder: '14',
      },
      {
        name: 'lineColor',
        label: 'Line Color',
        type: 'color',
        defaultValue: '#2196F3',
        required: true,
        placeholder: '#2196F3',
      },
      {
        name: 'typeOfMA',
        label: 'Type',
        type: 'select',
        defaultValue: 'SMA',
        options: [
          { value: 'SMA', label: 'SMA' },
          { value: 'EMA', label: 'EMA' },
        ],
        required: true,
      },
    ],
    transform: (values) => ({
      indicator: values.typeOfMA,
      timeperiod: Number(values.timeperiod),
      lineColor: values.lineColor,
    }),
  },

  BBAND: {
    indicatorId: 'BBAND',
    title: 'Bollinger Bands',
    submitLabel: 'Add',
    fields: [
      {
        name: 'timeperiod',
        label: 'Timeperiod',
        type: 'number',
        defaultValue: 20,
        min: 1,
        max: 200,
        step: 1,
        required: true,
        placeholder: '20',
      },
      {
        name: 'stdUp',
        label: 'Std. Up',
        type: 'number',
        defaultValue: 2,
        min: 0.1,
        max: 10,
        step: 0.1,
        required: true,
        placeholder: '2',
      },
      {
        name: 'stdDown',
        label: 'Std. Down',
        type: 'number',
        defaultValue: 2,
        min: 0.1,
        max: 10,
        step: 0.1,
        required: true,
        placeholder: '2',
      },
      {
        name: 'lineColor',
        label: 'MA Line Color',
        type: 'color',
        defaultValue: '#2196F3',
        required: true,
        placeholder: '#2196F3',
      },
      {
        name: 'upLineColor',
        label: 'Upper Line Color',
        type: 'color',
        defaultValue: '#2196F3',
        required: true,
        placeholder: '#2196F3',
      },
      {
        name: 'downLineColor',
        label: 'Lower Line Color',
        type: 'color',
        defaultValue: '#2196F3',
        required: true,
        placeholder: '#2196F3',
      },
      {
        name: 'typeOfMA',
        label: 'MA Type',
        type: 'select',
        defaultValue: 'SMA',
        options: [
          { value: 'SMA', label: 'SMA' },
          { value: 'EMA', label: 'EMA' },
        ],
        required: true,
      },
    ],
    transform: (values) => ({
      stdUp: Number(values.stdUp),
      stdDown: Number(values.stdDown),
      matype: values.typeOfMA === 'SMA' ? 0 : 1,
      timeperiod: Number(values.timeperiod),
      lineColor: values.lineColor,
      upLineColor: values.upLineColor,
      downLineColor: values.downLineColor,
    }),
  },

  RSI: {
    indicatorId: 'RSI',
    title: 'Relative Strength Index',
    submitLabel: 'Add',
    fields: [
      {
        name: 'timeperiod',
        label: 'Timeperiod',
        type: 'number',
        defaultValue: 14,
        min: 1,
        max: 100,
        step: 1,
        required: true,
        placeholder: '14',
      },
      {
        name: 'lineColor',
        label: 'Line Color',
        type: 'color',
        defaultValue: '#FFEB3B',
        required: true,
        placeholder: '#FFEB3B',
      },
      {
        name: 'overBroughtLevel',
        label: 'Overbought',
        type: 'number',
        defaultValue: 70,
        min: 1,
        max: 100,
        step: 1,
        required: true,
        placeholder: '70',
      },
      {
        name: 'overSoldLevel',
        label: 'Oversold',
        type: 'number',
        defaultValue: 30,
        min: 1,
        max: 100,
        step: 1,
        required: true,
        placeholder: '30',
      },
    ],
    transform: (values) => ({
      timeperiod: Number(values.timeperiod),
      lineColor: values.lineColor,
      overBroughtLevel: Number(values.overBroughtLevel),
      overSoldLevel: Number(values.overSoldLevel),
    }),
  },

  STOCH: {
    indicatorId: 'STOCH',
    title: 'Stochastic Oscillator',
    submitLabel: 'Add',
    fields: [
      {
        name: 'timeperiod',
        label: 'Timeperiod',
        type: 'number',
        defaultValue: 14,
        min: 1,
        max: 200,
        step: 1,
        required: true,
        placeholder: '14',
      },
      {
        name: 'fastPeriod',
        label: 'Fast %K Period',
        type: 'number',
        defaultValue: 5,
        min: 1,
        max: 200,
        step: 1,
        required: true,
        placeholder: '5',
      },
      {
        name: 'slowkPeriod',
        label: 'Slow %K Period',
        type: 'number',
        defaultValue: 3,
        min: 1,
        max: 200,
        step: 1,
        required: true,
        placeholder: '3',
      },
      {
        name: 'slowkMaType',
        label: 'Slow %K MA Type',
        type: 'select',
        defaultValue: 'SMA',
        options: [
          { value: 'SMA', label: 'SMA' },
          { value: 'EMA', label: 'EMA' },
        ],
        required: true,
      },
      {
        name: 'slowdPeriod',
        label: 'Slow %D Period',
        type: 'number',
        defaultValue: 3,
        min: 1,
        max: 200,
        step: 1,
        required: true,
        placeholder: '3',
      },
      {
        name: 'slowdMaType',
        label: 'Slow %D MA Type',
        type: 'select',
        defaultValue: 'SMA',
        options: [
          { value: 'SMA', label: 'SMA' },
          { value: 'EMA', label: 'EMA' },
        ],
        required: true,
      },
      {
        name: 'slowLineColor',
        label: 'Slow Line Color',
        type: 'color',
        defaultValue: '#FF9D23',
        required: true,
        placeholder: '#FF9D23',
      },
      {
        name: 'fastLineColor',
        label: 'Fast Line Color',
        type: 'color',
        defaultValue: '#EA5252',
        required: true,
        placeholder: '#EA5252',
      },
    ],
    transform: (values) => ({
      fastPeriod: Number(values.fastPeriod),
      slowkPeriod: Number(values.slowkPeriod),
      slowkMatype: values.slowkMaType === 'SMA' ? 0 : 1,
      slowdPeriod: Number(values.slowdPeriod),
      slowdMatype: values.slowdMaType === 'SMA' ? 0 : 1,
      timeperiod: Number(values.timeperiod),
      slowLineColor: values.slowLineColor,
      fastLineColor: values.fastLineColor,
    }),
  },

  VOL: {
    indicatorId: 'VOL',
    title: 'Volume',
    submitLabel: 'Add',
    fields: [
      {
        name: 'typeOfVol',
        label: 'Type',
        type: 'select',
        defaultValue: 'VOL',
        options: [
          { value: 'VOL', label: 'Volume (VOL)' },
          { value: 'OBV', label: 'On Balance Volume (OBV)' },
        ],
        required: true,
      },
      {
        name: 'lineColor',
        label: 'Line Color',
        type: 'color',
        defaultValue: '#2196F3',
        required: true,
        placeholder: '#2196F3',
        conditional: (values) => values.typeOfVol === 'OBV',
      },
    ],
    transform: (values) => ({
      indicator: values.typeOfVol,
      lineColor: values.lineColor,
    }),
  },
};
