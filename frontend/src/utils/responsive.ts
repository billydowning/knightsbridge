/**
 * Responsive Design Utilities
 * Provides breakpoints, hooks, and utility functions for responsive design
 */

import { useState, useEffect } from 'react';

// Breakpoint definitions
export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  LAPTOP: 1024,
  DESKTOP: 1200,
  WIDE: 1440,
} as const;

// Screen size categories
export type ScreenSize = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'wide';

// Chess board sizes for different screen sizes
export const CHESS_BOARD_SIZES = {
  mobile: {
    boardSize: 280, // 7 * 40px squares
    squareSize: 35,
    fontSize: '1.5rem',
  },
  tablet: {
    boardSize: 360, // 8 * 45px squares
    squareSize: 45,
    fontSize: '2rem',
  },
  laptop: {
    boardSize: 400, // 8 * 50px squares
    squareSize: 50,
    fontSize: '2.2rem',
  },
  desktop: {
    boardSize: 480, // 8 * 60px squares (current)
    squareSize: 60,
    fontSize: '2.5rem',
  },
  wide: {
    boardSize: 560, // 8 * 70px squares
    squareSize: 70,
    fontSize: '3rem',
  },
} as const;

// Container widths for different screen sizes
export const CONTAINER_WIDTHS = {
  mobile: '100%',
  tablet: '90%',
  laptop: '85%',
  desktop: '1200px',
  wide: '1400px',
} as const;

// Hook to get current screen size
export const useScreenSize = (): ScreenSize => {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    const updateScreenSize = () => {
      const width = window.innerWidth;
      
      if (width < BREAKPOINTS.MOBILE) {
        setScreenSize('mobile');
      } else if (width < BREAKPOINTS.TABLET) {
        setScreenSize('mobile');
      } else if (width < BREAKPOINTS.LAPTOP) {
        setScreenSize('tablet');
      } else if (width < BREAKPOINTS.DESKTOP) {
        setScreenSize('laptop');
      } else if (width < BREAKPOINTS.WIDE) {
        setScreenSize('desktop');
      } else {
        setScreenSize('wide');
      }
    };

    updateScreenSize();
    window.addEventListener('resize', updateScreenSize);
    
    return () => window.removeEventListener('resize', updateScreenSize);
  }, []);

  return screenSize;
};

// Hook to check if screen is mobile
export const useIsMobile = (): boolean => {
  const screenSize = useScreenSize();
  return screenSize === 'mobile';
};

// Hook to check if screen is tablet or smaller
export const useIsTabletOrSmaller = (): boolean => {
  const screenSize = useScreenSize();
  return screenSize === 'mobile' || screenSize === 'tablet';
};

// Hook to check if screen is laptop or larger (for MacBook Air)
export const useIsLaptopOrLarger = (): boolean => {
  const screenSize = useScreenSize();
  return screenSize === 'laptop' || screenSize === 'desktop' || screenSize === 'wide';
};

// Hook to get chess board configuration for current screen size
export const useChessBoardConfig = () => {
  const screenSize = useScreenSize();
  return CHESS_BOARD_SIZES[screenSize];
};

// Hook to get container width for current screen size
export const useContainerWidth = () => {
  const screenSize = useScreenSize();
  return CONTAINER_WIDTHS[screenSize];
};

// Utility function to get responsive styles
export const getResponsiveStyles = (styles: Record<ScreenSize, React.CSSProperties>) => {
  const screenSize = useScreenSize();
  return styles[screenSize];
};

// Media query utility
export const createMediaQuery = (breakpoint: keyof typeof BREAKPOINTS) => {
  return `@media (max-width: ${BREAKPOINTS[breakpoint]}px)`;
};

// Responsive layout utilities
export const LAYOUT_CONFIGS = {
  mobile: {
    gameLayout: 'column' as const,
    chatPosition: 'bottom' as const,
    boardMaxWidth: '100vw',
    spacing: '8px',
  },
  tablet: {
    gameLayout: 'column' as const,
    chatPosition: 'bottom' as const,
    boardMaxWidth: '90vw',
    spacing: '12px',
  },
  laptop: {
    gameLayout: 'row' as const,
    chatPosition: 'right' as const,
    boardMaxWidth: '50vw',
    spacing: '16px',
  },
  desktop: {
    gameLayout: 'row' as const,
    chatPosition: 'right' as const,
    boardMaxWidth: '480px',
    spacing: '20px',
  },
  wide: {
    gameLayout: 'row' as const,
    chatPosition: 'right' as const,
    boardMaxWidth: '560px',
    spacing: '24px',
  },
} as const;

// Hook to get layout configuration
export const useLayoutConfig = () => {
  const screenSize = useScreenSize();
  return LAYOUT_CONFIGS[screenSize];
};

// Responsive text sizes
export const TEXT_SIZES = {
  mobile: {
    h1: '1.5rem',
    h2: '1.25rem',
    h3: '1.125rem',
    body: '0.875rem',
    small: '0.75rem',
  },
  tablet: {
    h1: '1.75rem',
    h2: '1.5rem',
    h3: '1.25rem',
    body: '1rem',
    small: '0.875rem',
  },
  laptop: {
    h1: '2rem',
    h2: '1.75rem',
    h3: '1.5rem',
    body: '1rem',
    small: '0.875rem',
  },
  desktop: {
    h1: '2.25rem',
    h2: '2rem',
    h3: '1.75rem',
    body: '1rem',
    small: '0.875rem',
  },
  wide: {
    h1: '2.5rem',
    h2: '2.25rem',
    h3: '2rem',
    body: '1rem',
    small: '0.875rem',
  },
} as const;

// Hook to get text sizes for current screen
export const useTextSizes = () => {
  const screenSize = useScreenSize();
  return TEXT_SIZES[screenSize];
}; 