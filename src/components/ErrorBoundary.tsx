import React, { ErrorInfo, ReactNode } from 'react';
import { ShieldAlert, RefreshCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State;
  public props: Props;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-center font-mono">
          <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-8 border border-red-500/20">
            <ShieldAlert size={32} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-4 uppercase tracking-tighter">System Fault Detected</h1>
          <p className="text-zinc-500 max-w-md mb-8 leading-relaxed text-sm">
            The architectural integrity of this module has been compromised. Automatic recovery failed.
          </p>
          {this.state.error && (
            <div className="mb-12 p-4 bg-red-500/5 border border-red-500/10 rounded-lg max-w-lg w-full">
              <p className="text-red-400 font-mono text-[10px] break-words text-left">
                [FAULT_LOG]: {this.state.error.message}
              </p>
            </div>
          )}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 bg-white text-black px-8 py-4 rounded font-bold hover:bg-zinc-200 transition-all active:scale-95"
          >
            <RefreshCcw size={18} />
            Initialize Re-sequence
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
