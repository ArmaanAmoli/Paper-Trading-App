import { Component } from "react";

class ChartErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[ChartErrorBoundary] Caught error:", error);
    console.error("[ChartErrorBoundary] Component stack:", errorInfo.componentStack);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
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