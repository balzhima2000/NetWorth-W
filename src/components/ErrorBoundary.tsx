import React from 'react';

interface State {
  hasError: boolean;
  error: Error | null;
}

interface Props {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[#000000]">
          <div className="text-center max-w-md px-6">
            {/* Icon */}
            <div className="text-6xl mb-6">⚠️</div>

            {/* Heading */}
            <h1 className="text-2xl font-bold text-white mb-3">Something went wrong</h1>
            <p className="text-white/50 text-sm mb-2">
              An unexpected error occurred while rendering this page.
            </p>
            <p className="text-white/30 text-xs mb-8">
              Your data is safe — it's stored locally in your browser.
            </p>

            {/* Error detail (collapsible in dev) */}
            {this.state.error && (
              <details className="mb-6 text-left bg-white/5 rounded-xl p-4 border border-white/10">
                <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 transition-colors">
                  Error details
                </summary>
                <pre className="mt-3 text-xs text-red-400 whitespace-pre-wrap break-all overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10"
              >
                Try again
              </button>
              <button
                onClick={this.handleReload}
                className="px-5 py-2.5 rounded-xl bg-[#10B981] hover:bg-[#4752c4] text-white text-sm font-medium transition-colors"
              >
                Reload app
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
