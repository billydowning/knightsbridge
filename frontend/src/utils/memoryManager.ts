import React from 'react';

/**
 * Memory management utilities for Knightsbridge Chess
 */

interface MemoryUsage {
  used: number;
  total: number;
  percentage: number;
  timestamp: number;
}

class MemoryManager {
  private memoryHistory: MemoryUsage[] = [];
  private cleanupTasks: (() => void)[] = [];
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring() {
    // Monitor memory usage every 30 seconds
    this.intervalId = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000);

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  private checkMemoryUsage() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage: MemoryUsage = {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        timestamp: Date.now()
      };

      this.memoryHistory.push(usage);

      // Keep only last 100 measurements
      if (this.memoryHistory.length > 100) {
        this.memoryHistory = this.memoryHistory.slice(-100);
      }

      // Warn if memory usage is high
      if (usage.percentage > 80) {
        console.warn('⚠️ High memory usage detected:', usage.percentage.toFixed(2) + '%');
        this.triggerCleanup();
      }

      // Log in development
      if (process.env.NODE_ENV === 'development') {
        console.log('🧠 Memory usage:', usage.percentage.toFixed(2) + '%');
      }
    }
  }

  private triggerCleanup() {
    console.log('🧹 Triggering memory cleanup...');
    
    // Run all cleanup tasks
    this.cleanupTasks.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Error during cleanup task:', error);
      }
    });

    // Force garbage collection if available
    if ('gc' in window) {
      try {
        (window as any).gc();
      } catch (e) {
        // GC not available
      }
    }
  }

  addCleanupTask(task: () => void) {
    this.cleanupTasks.push(task);
  }

  removeCleanupTask(task: () => void) {
    const index = this.cleanupTasks.indexOf(task);
    if (index > -1) {
      this.cleanupTasks.splice(index, 1);
    }
  }

  getMemoryHistory(): MemoryUsage[] {
    return [...this.memoryHistory];
  }

  getCurrentMemoryUsage(): MemoryUsage | null {
    if (this.memoryHistory.length === 0) return null;
    return this.memoryHistory[this.memoryHistory.length - 1];
  }

  cleanup() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.triggerCleanup();
    this.memoryHistory = [];
    this.cleanupTasks = [];
  }
}

// Singleton instance
export const memoryManager = new MemoryManager();

/**
 * React hook for automatic cleanup
 */
export const useMemoryCleanup = (cleanupFn: () => void, deps: React.DependencyList = []) => {
  React.useEffect(() => {
    memoryManager.addCleanupTask(cleanupFn);
    
    return () => {
      memoryManager.removeCleanupTask(cleanupFn);
    };
  }, deps);
};

/**
 * Hook for managing large objects
 */
export const useLargeObject = <T>(factory: () => T, deps: React.DependencyList = []): T => {
  const [object, setObject] = React.useState<T>(factory);

  React.useEffect(() => {
    setObject(factory());
  }, deps);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      // Clear the object reference to help GC
      setObject(null as any);
    };
  }, []);

  return object;
};

/**
 * Hook for managing WebSocket connections with cleanup
 */
export const useWebSocketWithCleanup = (url: string, options: any = {}) => {
  const socketRef = React.useRef<WebSocket | null>(null);

  React.useEffect(() => {
    const socket = new WebSocket(url);
    socketRef.current = socket;

    // Add cleanup task
    const cleanupTask = () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };

    memoryManager.addCleanupTask(cleanupTask);

    return () => {
      memoryManager.removeCleanupTask(cleanupTask);
      cleanupTask();
      socketRef.current = null;
    };
  }, [url]);

  return socketRef.current;
};

/**
 * Hook for managing intervals with cleanup
 */
export const useIntervalWithCleanup = (callback: () => void, delay: number) => {
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    intervalRef.current = setInterval(callback, delay);

    const cleanupTask = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    memoryManager.addCleanupTask(cleanupTask);

    return () => {
      memoryManager.removeCleanupTask(cleanupTask);
      cleanupTask();
    };
  }, [callback, delay]);

  return intervalRef.current;
};

/**
 * Hook for managing timeouts with cleanup
 */
export const useTimeoutWithCleanup = (callback: () => void, delay: number) => {
  const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    timeoutRef.current = setTimeout(callback, delay);

    const cleanupTask = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    memoryManager.addCleanupTask(cleanupTask);

    return () => {
      memoryManager.removeCleanupTask(cleanupTask);
      cleanupTask();
    };
  }, [callback, delay]);

  return timeoutRef.current;
}; 