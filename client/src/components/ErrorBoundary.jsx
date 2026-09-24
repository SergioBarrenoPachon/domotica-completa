import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="glass-ios-elevated p-7 sm:p-9 rounded-[32px] border border-ios-rose/30 shadow-ios-diffuse text-center max-w-lg mx-auto my-8 sm:my-12 space-y-5 relative overflow-hidden">
          <div className="w-16 h-16 rounded-2xl bg-ios-rose/15 text-ios-rose flex items-center justify-center mx-auto border border-ios-rose/30 shadow-lg shadow-rose-950/30">
            <AlertCircle className="w-8 h-8 stroke-[2]" />
          </div>
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {this.props.fallbackTitle || 'Hubo un problema al cargar esta sección'}
            </h3>
            <p className="text-sm text-white/60 mt-1.5">
              {this.state.error?.message || 'Error inesperado al renderizar la vista.'}
            </p>
            {this.state.error && (
              <details className="text-left text-[11px] bg-black/40 p-3 mt-4 rounded-2xl text-ios-rose font-mono overflow-auto max-h-36 border border-ios-rose/20">
                <summary className="cursor-pointer text-white/50 text-xs hover:text-white font-sans">Ver detalles técnicos del error</summary>
                <pre className="mt-2 whitespace-pre-wrap text-[10px] text-white/70">{this.state.error.stack || String(this.state.error)}</pre>
              </details>
            )}
          </div>
          <div className="pt-2">
            <button
              onClick={this.handleReset}
              className="px-6 py-3 rounded-2xl bg-white text-black font-semibold text-sm flex items-center justify-center gap-2 mx-auto shadow-ios-ambient active:scale-95 transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Recargar y recuperar vista</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
