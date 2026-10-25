import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Caught error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetErrorBoundary.bind(this));
      }
      return (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--color-red-text)' }}>
          <h2>Something went wrong</h2>
          <pre
            style={{
              textAlign: 'left',
              background: 'var(--color-surface-raised)',
              padding: '16px',
              borderRadius: '8px',
              overflow: 'auto',
            }}
          >
            {this.state.error && this.state.error.toString()}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </pre>
          <button
            onClick={this.resetErrorBoundary.bind(this)}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: 'var(--color-up)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }

  resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };
}

export default ErrorBoundary;
