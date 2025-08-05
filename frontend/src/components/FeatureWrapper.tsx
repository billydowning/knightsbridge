/**
 * Toyota Feature Wrapper Component
 * 
 * Safely wraps features so they can be disabled without breaking baseline
 * If a feature breaks, disable it instantly via feature flags
 */

import React, { ReactNode } from 'react';
import { FEATURES, isDevelopment } from '../config/features';

interface FeatureWrapperProps {
  feature: keyof typeof FEATURES;
  children: ReactNode;
  fallback?: ReactNode;
  debugName?: string;
}

export const FeatureWrapper: React.FC<FeatureWrapperProps> = ({
  feature,
  children,
  fallback = null,
  debugName
}) => {
  const isEnabled = FEATURES[feature];
  
  // Debug logging in development
  if (isDevelopment && debugName) {
    console.log(`🚛 FEATURE [${debugName}]: ${feature} = ${isEnabled}`);
  }
  
  // Error boundary fallback - if feature crashes, show fallback
  try {
    return isEnabled ? <>{children}</> : <>{fallback}</>;
  } catch (error) {
    console.error(`🚨 FEATURE CRASH [${feature}]:`, error);
    
    // In development, show error details
    if (isDevelopment) {
      return (
        <div style={{
          background: '#ffebee',
          border: '1px solid #f44336',
          borderRadius: '4px',
          padding: '8px',
          margin: '4px 0',
          fontSize: '12px',
          color: '#c62828'
        }}>
          🚨 Feature "{feature}" crashed: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      );
    }
    
    // In production, fail silently to fallback
    return <>{fallback}</>;
  }
};

// Convenience wrapper for features that should only work in development
interface DevOnlyFeatureProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export const DevOnlyFeature: React.FC<DevOnlyFeatureProps> = ({
  children,
  fallback = null
}) => {
  return isDevelopment ? <>{children}</> : <>{fallback}</>;
};

// Hook for conditional logic based on features
export const useFeature = (feature: keyof typeof FEATURES) => {
  return FEATURES[feature];
};

// Hook for multiple feature checks
export const useFeatures = (...features: (keyof typeof FEATURES)[]) => {
  return features.reduce((acc, feature) => {
    acc[feature] = FEATURES[feature];
    return acc;
  }, {} as Record<keyof typeof FEATURES, boolean>);
};