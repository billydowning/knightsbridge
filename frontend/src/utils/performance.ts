import React from 'react';

/**
 * Performance monitoring utilities for Knightsbridge Chess
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Monitor Web Vitals
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as PerformanceEntry;
          this.recordMetric('LCP', lastEntry.startTime, { element: (lastEntry as any).element?.tagName });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            const fidEntry = entry as any;
            this.recordMetric('FID', fidEntry.processingStart - entry.startTime, { 
              name: entry.name,
              duration: entry.duration 
            });
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Cumulative Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          let clsValue = 0;
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          this.recordMetric('CLS', clsValue);
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }
    }
  }

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance Metric: ${name} = ${value}`, metadata);
    }
  }

  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration);
    });
  }

  measureSync<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric(name, duration);
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getAverageMetric(name: string): number {
    const metrics = this.getMetrics(name);
    if (metrics.length === 0) return 0;
    
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  clearMetrics() {
    this.metrics = [];
  }

  disconnect() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for measuring component render performance
 */
export const useRenderPerformance = (componentName: string) => {
  const renderCount = React.useRef(0);
  const lastRenderTime = React.useRef(performance.now());

  React.useEffect(() => {
    renderCount.current += 1;
    const renderTime = performance.now() - lastRenderTime.current;
    
    performanceMonitor.recordMetric(`${componentName}_render`, renderTime, {
      renderCount: renderCount.current
    });

    lastRenderTime.current = performance.now();
  });
};

/**
 * Hook for measuring WebSocket performance
 */
export const useWebSocketPerformance = () => {
  const measureConnection = React.useCallback((duration: number) => {
    performanceMonitor.recordMetric('websocket_connection', duration);
  }, []);

  const measureMessageLatency = React.useCallback((latency: number) => {
    performanceMonitor.recordMetric('websocket_latency', latency);
  }, []);

  const measureReconnection = React.useCallback((attempts: number, duration: number) => {
    performanceMonitor.recordMetric('websocket_reconnection', duration, { attempts });
  }, []);

  return {
    measureConnection,
    measureMessageLatency,
    measureReconnection
  };
};

/**
 * Hook for measuring chess engine performance
 */
export const useChessEnginePerformance = () => {
  const measureMoveGeneration = React.useCallback((duration: number, moveCount: number) => {
    performanceMonitor.recordMetric('chess_move_generation', duration, { moveCount });
  }, []);

  const measureMoveValidation = React.useCallback((duration: number) => {
    performanceMonitor.recordMetric('chess_move_validation', duration);
  }, []);

  const measureCheckDetection = React.useCallback((duration: number) => {
    performanceMonitor.recordMetric('chess_check_detection', duration);
  }, []);

  return {
    measureMoveGeneration,
    measureMoveValidation,
    measureCheckDetection
  };
};

/**
 * Performance decorator for class methods
 */
export function measurePerformance(target: any, propertyName: string, descriptor: PropertyDescriptor) {
  const method = descriptor.value;

  descriptor.value = function (...args: any[]) {
    const startTime = performance.now();
    const result = method.apply(this, args);
    
    if (result instanceof Promise) {
      return result.finally(() => {
        const duration = performance.now() - startTime;
        performanceMonitor.recordMetric(`${target.constructor.name}_${propertyName}`, duration);
      });
    } else {
      const duration = performance.now() - startTime;
      performanceMonitor.recordMetric(`${target.constructor.name}_${propertyName}`, duration);
      return result;
    }
  };
} 