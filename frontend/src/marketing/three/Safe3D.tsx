import { Component, Suspense, type ReactNode } from 'react';

/** Optional 3D must never take down the page — on any WebGL/chunk failure this
 *  renders nothing and the aurora poster underneath carries the hero. */
export class Safe3D extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return <Suspense fallback={null}>{this.props.children}</Suspense>;
  }
}
