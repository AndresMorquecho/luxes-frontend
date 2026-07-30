import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, remountKey: 0 };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);

    // React 19 + sticky/portals: remount después del commit fallido.
    const isDomRace =
      error?.name === 'NotFoundError' ||
      (typeof error?.message === 'string' && error.message.includes('removeChild'));
    if (isDomRace) {
      window.setTimeout(() => {
        this.setState((s) => ({
          error: null,
          remountKey: (s.remountKey || 0) + 1,
        }));
      }, 50);
    }
  }

  handleReset = () => {
    this.setState((s) => ({ error: null, remountKey: (s.remountKey || 0) + 1 }));
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.assign('/');
    }
  };

  render() {
    const { error, remountKey = 0 } = this.state;
    if (!error) {
      return <React.Fragment key={remountKey}>{this.props.children}</React.Fragment>;
    }

    const isDomRace =
      error?.name === 'NotFoundError' ||
      (typeof error?.message === 'string' && error.message.includes('removeChild'));
    if (isDomRace) {
      return (
        <div className="flex items-center justify-center p-12 min-h-[300px]">
          <div className="w-6 h-6 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">Algo salió mal</h1>
          <p className="text-sm text-slate-500 mb-6">
            La interfaz encontró un error inesperado. Puedes volver al inicio e intentar de nuevo.
          </p>
          {import.meta.env.DEV && (
            <pre className="text-left text-xs bg-slate-100 rounded-lg p-3 mb-4 overflow-auto max-h-32 text-red-700">
              {error.message}
            </pre>
          )}
          <button
            type="button"
            onClick={this.handleReset}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-xl"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }
}
