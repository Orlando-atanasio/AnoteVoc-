import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

// A9: a render crash (bad persisted data, unexpected shape) must never
// produce a permanent white screen. Offer recovery instead.
export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(err: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: err instanceof Error ? err.message : 'Erro desconhecido',
    };
  }

  componentDidCatch(err: unknown) {
    try {
      const prev = localStorage.getItem('anote_voce_crash_log');
      const entry = JSON.stringify({
        at: new Date().toISOString(),
        message: err instanceof Error ? err.message : String(err),
      });
      localStorage.setItem(
        'anote_voce_crash_log',
        prev ? `${prev}\n${entry}` : entry
      );
    } catch {
      // storage unavailable — ignore
    }
  }

  private handleResetData = () => {
    try {
      const keys = Object.keys(localStorage).filter((k) =>
        k.startsWith('anote_voce_')
      );
      keys.forEach((k) => {
        if (!k.includes('.corrupt.')) localStorage.removeItem(k);
      });
    } catch {
      // ignore
    }
    this.setState({ hasError: false, message: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Erro no aplicativo"
          className="min-h-screen bg-[#F2F2F7] flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="text-[20px] font-bold text-black mb-2">
            Algo deu errado
          </div>
          <p className="text-[14px] text-[#8E8E93] mb-1 max-w-[300px]">
            O app encontrou um erro e não conseguiu abrir suas notas. Seus
            dados corrompidos foram preservados para recuperação.
          </p>
          <p className="text-[12px] text-[#8E8E93] mb-5 max-w-[300px]">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false, message: '' });
              window.location.reload();
            }}
            className="w-full max-w-[300px] h-[48px] bg-[#D97706] text-white rounded-[12px] text-[17px] font-semibold mb-2"
          >
            Tentar novamente
          </button>
          <button
            type="button"
            onClick={this.handleResetData}
            className="w-full max-w-[300px] h-[48px] bg-white border border-[#E5E5EA] text-[#FF3B30] rounded-[12px] text-[17px] font-medium"
          >
            Apagar dados locais e recomeçar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
