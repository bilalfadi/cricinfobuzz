'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console but don't show to user
    console.warn('⚠️ Error caught by ErrorBoundary (suppressed):', error);
    console.warn('Error info:', errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      // Render fallback UI or nothing
      return this.props.fallback || null;
    }

    return this.props.children;
  }
}
