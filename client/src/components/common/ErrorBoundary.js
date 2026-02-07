import React from 'react';

// Simple ErrorBoundary to avoid rendering raw objects as children and show
// a readable error instead of a blank screen when a render error occurs.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // store additional info for debugging
    this.setState({ info });
     
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      const err = this.state.error;
      const info = this.state.info;
      const message = err && err.message ? err.message : String(err);
      return (
        <div className="p-6">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Wystąpił błąd aplikacji</h2>
          <div className="text-sm text-red-600 mb-4">{message}</div>
          {info && info.componentStack && (
            <pre className="text-xs text-gray-700 bg-gray-100 p-2 rounded">{info.componentStack}</pre>
          )}
          <div className="mt-4 text-sm text-gray-600">Spróbuj odświeżyć stronę. Jeśli błąd się powtarza, sprawdź konsolę i wyślij logi.</div>
        </div>
      );
    }

    return this.props.children;
  }
}
