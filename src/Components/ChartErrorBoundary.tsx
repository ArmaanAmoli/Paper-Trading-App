import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface ChartErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ChartErrorBoundary extends Component<
  { children: ReactNode },
  ChartErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(): Partial<ChartErrorBoundaryState> {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[ChartErrorBoundary] Caught error:', error);
    console.error('[ChartErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      const errorMessage = this.state.error ? this.state.error.toString() : 'Unknown error';
      return (
        <div className="chart-error-fallback">
          <div className="chart-error-card">
            <h3 className="chart-error-title">Something went wrong loading this chart</h3>
            <p className="chart-error-message">{errorMessage}</p>
            <button
              className="chart-error-reload"
              onClick={() => this.setState({ hasError: false, error: null, errorInfo: null })}
            >
              Reload
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChartErrorBoundary;
