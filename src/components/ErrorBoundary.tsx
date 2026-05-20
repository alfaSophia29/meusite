
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0c10] p-6 text-center">
          <div className="bg-white dark:bg-darkcard p-10 rounded-[3rem] shadow-2xl border border-red-500/20 max-w-lg w-full">
            <div className="bg-red-500/10 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="text-2xl font-black uppercase mb-4 text-gray-900 dark:text-white">Erro Inesperado</h2>
            <p className="text-gray-500 text-sm mb-8 font-medium">Ocorreu um erro crítico na interface. Por favor, tente recarregar a página.</p>
            <div className="bg-red-500/5 p-4 rounded-2xl mb-8 text-left border border-red-500/10">
              <p className="text-[10px] font-black uppercase text-red-500 mb-1">Detalhes do erro:</p>
              <pre className="text-[10px] font-mono text-red-400 overflow-x-auto whitespace-pre-wrap">
                {this.state.error?.message || 'Erro Desconhecido'}
              </pre>
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
            >
              Recarregar Aplicação
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
