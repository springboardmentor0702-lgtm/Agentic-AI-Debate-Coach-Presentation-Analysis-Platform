import { Component } from "react";

/**
 * Every 3D scene in the glass revamp is optional decoration, never a
 * load-bearing part of the page. If WebGL is unavailable (old device,
 * disabled hardware acceleration, a driver quirk) or three.js throws
 * for any reason, this swallows it and renders `fallback` instead -
 * the surrounding page (hero copy, the actual login/register form)
 * keeps working exactly as before either way.
 */
export default class WebGLBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    // Deliberately quiet - this is decorative, not a real app error.
    if (import.meta.env.DEV) {
      console.warn("3D scene disabled, falling back:", error);
    }
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null;
    return this.props.children;
  }
}
