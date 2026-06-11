import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center">
          <p className="text-red-600 font-medium mb-2">Something went wrong</p>
          <pre className="text-xs text-left bg-red-50 border border-red-200 rounded p-4 overflow-auto">
            {this.state.error.message}
          </pre>
          <button
            onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
            className="mt-6 text-sm text-violet-700 hover:underline"
          >
            Go home
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
