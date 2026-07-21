import React from 'react';

export default class AutomationErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('Automation module render failed', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">Automations could not be displayed</h1>
          <p className="mt-2 text-gray-600">The page received unexpected data. Reload it to try again.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
          >
            Reload automations
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
