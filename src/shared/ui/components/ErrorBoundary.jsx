import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  handleReset = () => {
    this.setState({ error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.assign('/');
    }
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

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
