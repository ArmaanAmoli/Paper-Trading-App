import { useEffect, useRef, useState } from 'react';
import { fetchIndicatorData } from '../../services/dataRequesterForCharts';
import { useParams } from 'react-router-dom';
import { IndicatorsList } from '../../Context/context';
import { useContext } from 'react';
import type { IndicatorConfig } from './indicatorConfigs';
import type { IndicatorListItem } from '../../Context/context';

const FOCUSABLE_SELECTOR = [
  'input',
  'select',
  'button',
  'textarea',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface IndicatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  indicatorConfig: IndicatorConfig | null;
  interval: string;
}

export default function IndicatorModal({
  isOpen,
  onClose,
  indicatorConfig,
  interval,
}: IndicatorModalProps) {
  const { ticker } = useParams<{ ticker: string }>();
  const indicatorContext = useContext(IndicatorsList);
  const setIndicatorList = indicatorContext?.setIndicatorList;
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [colorPickerValues, setColorPickerValues] = useState<Record<string, string>>({});

  // Initialize field values from config defaults
  const getInitialValues = (config: IndicatorConfig) => {
    const initialValues: Record<string, unknown> = {};
    const initialColorValues: Record<string, string> = {};
    config.fields.forEach((field) => {
      initialValues[field.name] = field.defaultValue;
      if (field.type === 'color') {
        initialColorValues[field.name] = String(field.defaultValue);
      }
    });
    return { initialValues, initialColorValues };
  };

  // Use configKey to trigger re-initialization when config changes
  const configKey =
    isOpen && indicatorConfig
      ? JSON.stringify(indicatorConfig.fields.map((f) => f.name + ':' + String(f.defaultValue)))
      : null;

  useEffect(() => {
    if (isOpen && indicatorConfig) {
      const { initialValues, initialColorValues } = getInitialValues(indicatorConfig);
      // Defer state updates to avoid synchronous setState in effect
      setTimeout(() => {
        setFieldValues(initialValues);
        setColorPickerValues(initialColorValues);
        setErrors({});
      }, 0);
    }
  }, [configKey, isOpen, indicatorConfig]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
      // Focus first input after render
      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector(
          FOCUSABLE_SELECTOR,
        ) as HTMLElement | null;
        firstInput?.focus();
      }, 0);

      // Trap focus
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
          return;
        }

        if (e.key === 'Tab') {
          const focusableElements =
            modalRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
          if (!focusableElements || focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }

        // Enter to submit when in input
        if (
          e.key === 'Enter' &&
          (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)
        ) {
          const submitBtn = modalRef.current?.querySelector(
            '.modal-submit-btn',
          ) as HTMLElement | null;
          if (submitBtn && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            submitBtn.click();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    } else {
      // Return focus to trigger button
      previousActiveElement.current?.focus?.();
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleFieldChange = (name: string, value: unknown) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleColorChange = (name: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [name]: value }));
    setColorPickerValues((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!indicatorConfig || !setIndicatorList) return;
    // Validate required fields
    const newErrors: Record<string, string> = {};
    indicatorConfig.fields.forEach((field) => {
      if (field.required && (!fieldValues[field.name] || fieldValues[field.name] === '')) {
        newErrors[field.name] = field.errorMessage || 'This field is required';
      }
      if (field.type === 'number' && fieldValues[field.name] !== '') {
        const num = Number(fieldValues[field.name]);
        if (isNaN(num)) {
          newErrors[field.name] = 'Must be a valid number';
        } else if (field.min !== undefined && num < field.min) {
          newErrors[field.name] = `Must be at least ${field.min}`;
        } else if (field.max !== undefined && num > field.max) {
          newErrors[field.name] = `Must be at most ${field.max}`;
        }
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Build properties object
    const properties: Record<string, unknown> = {
      ticker,
      interval,
      period: 'max',
      indicator: indicatorConfig.indicatorId,
      ...fieldValues,
    };

    // Handle special transformations
    if (indicatorConfig.transform) {
      const transformResult = indicatorConfig.transform(fieldValues);
      Object.assign(properties, transformResult);
    }

    try {
      const data = await fetchIndicatorData(properties);
      const dataRecord = data;
      const otherEntries = Object.entries(dataRecord).filter(([k]) => k !== 'title');
      const finalProperties: IndicatorListItem = {
        indicator: indicatorConfig.indicatorId,
        indicatorId: indicatorConfig.indicatorId,
        title: indicatorConfig.title,
        submitLabel: indicatorConfig.submitLabel,
        fields: indicatorConfig.fields,
        ...Object.fromEntries(otherEntries),
      };
      setIndicatorList((prev: IndicatorListItem[]): IndicatorListItem[] => [
        ...prev,
        finalProperties,
      ]);
      onClose();
    } catch (error: unknown) {
      console.error('Failed to add indicator:', error);
      // Could add a general error toast here
      return;
    }
  };

  if (!isOpen || !indicatorConfig) return null;

  return (
    <div
      className="indicator-modal-overlay"
      onClick={onClose}
      role="presentation"
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        className="indicator-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="indicator-modal-header">
          <h2 id="modal-title" className="indicator-modal-title">
            {indicatorConfig.title}
          </h2>
          <button
            type="button"
            className="indicator-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </header>

        {/* Body */}
        <div className="indicator-modal-body">
          {indicatorConfig.fields.map((field) => (
            <div key={field.name} className="indicator-modal-field">
              <label htmlFor={`modal-field-${field.name}`} className="indicator-modal-label">
                {field.label}
              </label>
              <div className="indicator-modal-input-wrapper">
                {field.type === 'color' ? (
                  <>
                    <input
                      type="color"
                      id={`modal-field-${field.name}-picker`}
                      className="indicator-modal-color-picker"
                      value={colorPickerValues[field.name] || String(field.defaultValue)}
                      onChange={(e) => handleColorChange(field.name, e.target.value)}
                      aria-label={`${field.label} color picker`}
                    />
                    <input
                      type="text"
                      id={`modal-field-${field.name}`}
                      className="indicator-modal-input indicator-modal-color-input"
                      value={String(fieldValues[field.name] || field.defaultValue)}
                      onChange={(e) => handleColorChange(field.name, e.target.value.toUpperCase())}
                      placeholder={field.placeholder}
                      aria-invalid={!!errors[field.name]}
                      aria-describedby={
                        errors[field.name] ? `modal-error-${field.name}` : undefined
                      }
                    />
                    <div
                      className="indicator-modal-color-swatch"
                      style={{
                        backgroundColor:
                          colorPickerValues[field.name] || String(field.defaultValue),
                      }}
                      onClick={() =>
                        document.getElementById(`modal-field-${field.name}-picker`)?.click()
                      }
                      aria-hidden="true"
                    />
                  </>
                ) : field.type === 'select' && field.options ? (
                  <select
                    id={`modal-field-${field.name}`}
                    className="indicator-modal-select"
                    value={String(fieldValues[field.name] || field.defaultValue)}
                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `modal-error-${field.name}` : undefined}
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type}
                    id={`modal-field-${field.name}`}
                    className="indicator-modal-input"
                    value={String(fieldValues[field.name] ?? field.defaultValue)}
                    onChange={(e) =>
                      handleFieldChange(
                        field.name,
                        field.type === 'number' ? e.target.value : e.target.value,
                      )
                    }
                    min={field.min}
                    max={field.max}
                    step={field.step}
                    placeholder={field.placeholder}
                    aria-invalid={!!errors[field.name]}
                    aria-describedby={errors[field.name] ? `modal-error-${field.name}` : undefined}
                  />
                )}
                {errors[field.name] && (
                  <p id={`modal-error-${field.name}`} className="indicator-modal-error">
                    {errors[field.name]}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <footer className="indicator-modal-footer">
          <button
            type="button"
            className="indicator-modal-btn indicator-modal-btn-cancel"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="indicator-modal-btn indicator-modal-btn-submit modal-submit-btn"
            onClick={handleSubmit}
          >
            {indicatorConfig.submitLabel || 'Add'}
          </button>
        </footer>
      </div>
    </div>
  );
}
