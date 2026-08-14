import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('StudyNest ErrorBoundary caught error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-wrap">
          <div className="section-card error-boundary-card">
            <div className="error-boundary-icon">
              <AlertTriangle size={32} />
            </div>
            <h2>Something went wrong</h2>
            <p className="muted-text">
              An unexpected error occurred while rendering this page. Please try refreshing or return to the home page.
            </p>
            <div className="card-actions wrap center">
              <button type="button" className="btn-primary" onClick={this.handleReload}>
                <RotateCcw size={16} />
                <span>Reload Page</span>
              </button>
              <button type="button" className="btn-secondary" onClick={this.handleGoHome}>
                <Home size={16} />
                <span>Go to Home</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
