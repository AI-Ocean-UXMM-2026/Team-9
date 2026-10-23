import { Component, type ReactNode } from 'react';
import i18n from '../i18n';
export class ErrorBoundary extends Component<
  { children: ReactNode; resetKey?: string },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidUpdate(previousProps: Readonly<{ children: ReactNode; resetKey?: string }>) {
    if (this.state.failed && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ failed: false });
    }
  }
  render() {
    if (this.state.failed)
      return (
        <section role="alert">
          <h1>{i18n.t('error')}</h1>
          <p>{i18n.t('errorBody')}</p>
          <button onClick={() => window.location.reload()}>
            {i18n.t('reload')}
          </button>
        </section>
      );
    return this.props.children;
  }
}
