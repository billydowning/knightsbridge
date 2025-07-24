import React, { useState, useEffect } from 'react';
import { performanceMonitor } from '../utils/performance';
// import { memoryManager } from '../utils/memoryManager';

interface PerformanceDashboardProps {
  isVisible?: boolean;
  onClose?: () => void;
}

export const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  isVisible = false,
  onClose
}) => {
  const [metrics, setMetrics] = useState<any[]>([]);
  const [memoryUsage, setMemoryUsage] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isVisible) return;

    const updateMetrics = () => {
      const allMetrics = performanceMonitor.getMetrics();
      const recentMetrics = allMetrics.slice(-20); // Last 20 metrics
      setMetrics(recentMetrics);
      
      // const currentMemory = memoryManager.getCurrentMemoryUsage();
  const currentMemory = null;
      setMemoryUsage(currentMemory);
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  const getMetricColor = (name: string, value: number) => {
    if (name.includes('LCP') && value > 2500) return '#ff4444';
    if (name.includes('FID') && value > 100) return '#ff4444';
    if (name.includes('CLS') && value > 0.1) return '#ff4444';
    if (name.includes('render') && value > 16) return '#ffaa00';
    return '#44ff44';
  };

  const formatMetricValue = (name: string, value: number) => {
    if (name.includes('LCP') || name.includes('FID') || name.includes('render')) {
      return `${value.toFixed(2)}ms`;
    }
    if (name.includes('CLS')) {
      return value.toFixed(3);
    }
    if (name.includes('memory')) {
      return `${(value / 1024 / 1024).toFixed(2)}MB`;
    }
    return value.toFixed(2);
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      width: isExpanded ? '400px' : '300px',
      backgroundColor: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '8px',
      padding: '10px',
      color: '#fff',
      fontSize: '12px',
      zIndex: 1000,
      maxHeight: '80vh',
      overflow: 'auto'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '10px',
        borderBottom: '1px solid #333',
        paddingBottom: '5px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px' }}>📊 Performance Monitor</h3>
        <div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              cursor: 'pointer',
              marginRight: '5px'
            }}
          >
            {isExpanded ? '📉' : '📈'}
          </button>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Memory Usage */}
      {memoryUsage && (
        <div style={{ marginBottom: '15px' }}>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>🧠 Memory Usage</h4>
          <div style={{
            backgroundColor: '#333',
            borderRadius: '4px',
            padding: '5px',
            fontSize: '11px'
          }}>
            <div>Used: {(memoryUsage.used / 1024 / 1024).toFixed(2)}MB</div>
            <div>Total: {(memoryUsage.total / 1024 / 1024).toFixed(2)}MB</div>
            <div style={{
              color: memoryUsage.percentage > 80 ? '#ff4444' : '#44ff44'
            }}>
              Usage: {memoryUsage.percentage.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* Web Vitals */}
      <div style={{ marginBottom: '15px' }}>
        <h4 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>⚡ Web Vitals</h4>
        <div style={{
          backgroundColor: '#333',
          borderRadius: '4px',
          padding: '5px',
          fontSize: '11px'
        }}>
          {['LCP', 'FID', 'CLS'].map(vital => {
            const vitalMetrics = metrics.filter(m => m.name === vital);
            const latestMetric = vitalMetrics[vitalMetrics.length - 1];
            return latestMetric ? (
              <div key={vital} style={{
                color: getMetricColor(vital, latestMetric.value),
                marginBottom: '2px'
              }}>
                {vital}: {formatMetricValue(vital, latestMetric.value)}
              </div>
            ) : null;
          })}
        </div>
      </div>

      {/* Recent Metrics */}
      {isExpanded && (
        <div>
          <h4 style={{ margin: '0 0 5px 0', fontSize: '12px' }}>📈 Recent Metrics</h4>
          <div style={{
            backgroundColor: '#333',
            borderRadius: '4px',
            padding: '5px',
            fontSize: '10px',
            maxHeight: '200px',
            overflow: 'auto'
          }}>
            {metrics.slice(-10).reverse().map((metric, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '2px',
                color: getMetricColor(metric.name, metric.value)
              }}>
                <span>{metric.name}</span>
                <span>{formatMetricValue(metric.name, metric.value)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div style={{
        marginTop: '10px',
        paddingTop: '10px',
        borderTop: '1px solid #333',
        display: 'flex',
        gap: '5px'
      }}>
        <button
          onClick={() => performanceMonitor.clearMetrics()}
          style={{
            backgroundColor: '#444',
            border: 'none',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Clear Metrics
        </button>
        <button
          onClick={() => {/* memoryManager.cleanup() */}}
          style={{
            backgroundColor: '#444',
            border: 'none',
            color: '#fff',
            padding: '3px 8px',
            borderRadius: '3px',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Cleanup Memory
        </button>
      </div>
    </div>
  );
}; 