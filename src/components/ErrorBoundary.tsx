import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-xl p-6 space-y-3">
            <h1 className="font-display text-lg font-semibold text-red-800">
              Application Error
            </h1>
            <p className="text-sm text-slate-600">
              एडमिन पैनल लोड करते समय एक त्रुटि आई। कृपया पेज रीफ़्रेश करें।
            </p>
            {this.state.message && (
              <pre className="text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-3 overflow-auto text-red-700">
                {this.state.message}
              </pre>
            )}
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
