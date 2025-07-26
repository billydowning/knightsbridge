/**
 * Responsive Design Utilities
 * Provides breakpoints, hooks, and utility functions for responsive design
 */

import { useState, useEffect } from 'react';

// Breakpoint definitions
export const BREAKPOINTS = {
  MOBILE: 480,
  TABLET: 768,
  LAPTOP: 900,   // Lowered to match desktop layout detection
  DESKTOP: 1366, // Common laptop width
  WIDE: 1920,    // Full HD and above
} as const;

// Screen size categories
export type ScreenSize = 'mobile' | 'tablet' | 'laptop' | 'desktop' | 'wide';

// Chess board sizes for different screen sizes
export const CHESS_BOARD_SIZES = {
  mobile: {
    boardSize: 280, // 8 * 35px squares
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
    boardSize: 480, // 8 * 60px squares
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
    let timeoutId: NodeJS.Timeout;
    
    const updateScreenSize = () => {
      const width = window.innerWidth;
      
      // Debug logging
      console.log('Screen width:', width, 'px');
      
      let newScreenSize: ScreenSize;
      
      if (width < BREAKPOINTS.MOBILE) {
        newScreenSize = 'mobile';
      } else if (width < BREAKPOINTS.TABLET) {
        newScreenSize = 'tablet';
      } else if (width < BREAKPOINTS.LAPTOP) {
        newScreenSize = 'tablet';
      } else if (width < BREAKPOINTS.DESKTOP) {
        newScreenSize = 'laptop';
      } else if (width < BREAKPOINTS.WIDE) {
        newScreenSize = 'desktop';
      } else {
        newScreenSize = 'wide';
      }
      
      console.log('Detected screen size:', newScreenSize);
      setScreenSize(newScreenSize);
    };

    // Debounce the resize event to prevent rapid switching
    const debouncedUpdateScreenSize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(updateScreenSize, 150);
    };

    updateScreenSize(); // Initial check
    window.addEventListener('resize', debouncedUpdateScreenSize);
    
    return () => {
      window.removeEventListener('resize', debouncedUpdateScreenSize);
      clearTimeout(timeoutId);
    };
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

// Hook for robust laptop/desktop detection that works with browser resizing
export const useIsDesktopLayout = (): boolean => {
  const [isDesktopLayout, setIsDesktopLayout] = useState(false);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const checkLayout = () => {
      const width = window.innerWidth;
      // Use a lower threshold to ensure we get desktop layout even when console is open
      // This prevents switching between desktop/tablet when opening dev tools
      const shouldUseDesktopLayout = width >= 900;
      
      console.log('Desktop layout detection:', { 
        width, 
        shouldUseDesktopLayout,
        threshold: '>= 900px (lowered from 1024px)'
      });
      
      setIsDesktopLayout(shouldUseDesktopLayout);
    };

    // Debounce the resize event to prevent rapid switching
    const debouncedCheckLayout = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(checkLayout, 100);
    };

    checkLayout(); // Initial check
    window.addEventListener('resize', debouncedCheckLayout);
    
    return () => {
      window.removeEventListener('resize', debouncedCheckLayout);
      clearTimeout(timeoutId);
    };
  }, []);

  return isDesktopLayout;
};

// Hook specifically for MacBook Air and similar laptop screens
export const useIsMacBookAir = (): boolean => {
  const [isMacBookAir, setIsMacBookAir] = useState(false);

  useEffect(() => {
    const checkScreen = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // MacBook Air typically has 1440x900 or similar aspect ratio
      // Check if width is around 1440px and aspect ratio is roughly 16:10
      const isMacBookAirSize = width >= 1366 && width <= 1600 && 
                               height >= 768 && height <= 1024 &&
                               (width / height) >= 1.4 && (width / height) <= 1.8;
      
      console.log('MacBook Air detection:', { 
        width, 
        height, 
        ratio: (width/height).toFixed(2), 
        isMacBookAir: isMacBookAirSize,
        widthRange: `${width >= 1366 && width <= 1600}`,
        heightRange: `${height >= 768 && height <= 1024}`,
        aspectRatio: `${(width / height) >= 1.4 && (width / height) <= 1.8}`
      });
      setIsMacBookAir(isMacBookAirSize);
    };

    checkScreen();
    window.addEventListener('resize', checkScreen);
    
    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  return isMacBookAir;
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