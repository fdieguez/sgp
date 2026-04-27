import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    console.error("ErrorBoundary atrapó un error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[200px] flex flex-col items-center justify-center p-6 bg-red-900/20 border border-red-700/50 rounded-xl">
            <h2 className="text-lg font-bold text-red-500 mb-2">¡Ups! Algo salió mal en este componente.</h2>
            <p className="text-sm text-red-300 mb-4 text-center max-w-md">
                Hemos encapsulado este error para que el resto de la página siga funcionando.
            </p>
            <details className="text-xs text-gray-400 bg-gray-900 p-4 rounded text-left w-full overflow-auto max-h-60 mt-4">
                <summary className="cursor-pointer font-bold mb-2">Ver detalles del error</summary>
                <div className="whitespace-pre-wrap font-mono mt-2 text-red-400">
                    {this.state.error && this.state.error.toString()}
                </div>
                <div className="whitespace-pre-wrap font-mono mt-2">
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                </div>
            </details>
            <button 
                className="mt-6 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-semibold transition-colors"
                onClick={() => window.location.reload()}
            >
                Recargar Página
            </button>
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;
