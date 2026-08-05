import React from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[GlobalErrorBoundary] Caught unexpected error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-8 max-w-lg w-full shadow-lg space-y-5">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
              <AlertTriangle size={32} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-gray-900 tracking-tight">Something went wrong loading this section</h2>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                An unexpected error occurred while rendering the page content. Click below to reload or return to the dashboard.
              </p>
            </div>

            {this.state.error?.message && (
              <div className="p-3 bg-white border border-amber-200 rounded-xl text-left font-mono text-[11px] text-red-700 max-h-32 overflow-y-auto break-all shadow-2xs">
                {this.state.error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-1">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all text-xs flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <RefreshCw size={14} /> Reload Page
              </button>

              <a
                href="/"
                className="px-5 py-2.5 bg-white border border-gray-300 text-gray-800 font-bold hover:bg-gray-50 rounded-xl transition-colors text-xs flex items-center gap-2 shadow-xs"
              >
                <Home size={14} /> Go to Dashboard
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
