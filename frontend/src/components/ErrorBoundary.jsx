import { Component } from "react";

/**
 * React's default behavior on an uncaught render error is to unmount
 * the ENTIRE app - a bug on any single page shows as a fully blank
 * screen, with no clue what happened or how to recover. This wraps
 * the whole app once, in main.jsx, and catches exactly that class of
 * error: shows a message and a way back instead of a blank page.
 *
 * This does not replace fixing the underlying bug - it just makes the
 * failure mode survivable and diagnosable instead of silent.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Uncaught error in the app:", error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.href = "/dashboard";
  };

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-surface text-ink flex items-center justify-center px-6">
          <div className="max-w-md text-center">
            <p className="font-mono text-xs tracking-widest text-danger uppercase mb-4">
              Something went wrong
            </p>
            <h1 className="font-display text-2xl mb-4">
              This page hit an unexpected error.
            </h1>
            <p className="text-sm text-faint mb-8">
              Your action likely still went through on the server - try going
              back to the dashboard and checking. If this keeps happening,
              note what you were doing when it appeared.
            </p>
            <button
              onClick={this.handleReload}
              className="font-mono text-xs uppercase tracking-wide bg-accent text-surface px-5 py-3 rounded-sm hover:opacity-90 transition-opacity"
            >
              Back to dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
