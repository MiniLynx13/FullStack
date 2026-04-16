import '@testing-library/jest-dom';
import React from 'react';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage with spies
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock fetch
global.fetch = jest.fn();

// Helper to filter Chakra-specific props
const filterChakraProps = (props: any) => {
  const chakraProps = [
    'borderColor', 'colorScheme', 'textAlign', 'justifyContent', 
    'flexDirection', 'borderRadius', 'alignItems', 'minH', 'maxW',
    'boxShadow', 'borderBottom', 'whiteSpace', 'bg', 'color', 'py',
    'px', 'mt', 'mb', 'ml', 'mr', 'pt', 'pb', 'pl', 'pr', 'mx', 'my',
    'gap', 'borderTop', 'borderLeft', 'borderRight', 'position',
    'top', 'left', 'right', 'bottom', 'zIndex', 'cursor', 'transition',
    'as', 'templateColumns', 'isInline', 'variant', 'size', 'isLoading',
    'isDisabled', 'spacing', 'placement', 'isOpen', 'onClose'
  ];
  
  const filtered: any = {};
  for (const key in props) {
    if (!chakraProps.includes(key) && !key.startsWith('_')) {
      filtered[key] = props[key];
    }
  }
  return filtered;
};

// Mock Chakra UI components
const createMockComponent = (displayName: string, defaultElement: string = 'div') => {
  const Component = ({ children, ...props }: any) => {
    const filteredProps = filterChakraProps(props);
    return React.createElement(defaultElement, { ...filteredProps, 'data-testid': displayName }, children);
  };
  Component.displayName = displayName;
  return Component;
};

// Complete mock for Chakra UI v3
jest.mock('@chakra-ui/react', () => {
  const React = require('react');
  
  // Create all mock components
  const Box = createMockComponent('Box', 'div');
  const Flex = createMockComponent('Flex', 'div');
  const Text = createMockComponent('Text', 'span');
  const Heading = createMockComponent('Heading', 'h1');
  const Button = createMockComponent('Button', 'button');
  const Input = createMockComponent('Input', 'input');
  const Textarea = createMockComponent('Textarea', 'textarea');
  const Grid = createMockComponent('Grid', 'div');
  const GridItem = createMockComponent('GridItem', 'div');
  const Image = createMockComponent('Image', 'img');
  const Container = createMockComponent('Container', 'div');
  const Link = createMockComponent('Link', 'a');
  const Alert = createMockComponent('Alert', 'div');
  const AlertTitle = createMockComponent('AlertTitle', 'span');
  const AlertDescription = createMockComponent('AlertDescription', 'span');
  const Menu = createMockComponent('Menu', 'div');
  const MenuButton = createMockComponent('MenuButton', 'button');
  const MenuList = createMockComponent('MenuList', 'div');
  const MenuItem = createMockComponent('MenuItem', 'div');
  const Spinner = () => React.createElement('div', { 'data-testid': 'Spinner' }, 'Loading...');
  const CloseButton = (props: any) => React.createElement('button', { ...props, 'data-testid': 'CloseButton' }, '×');
  const IconButton = ({ children, ...props }: any) => React.createElement('button', { ...props, 'data-testid': 'IconButton' }, children);
  
  return {
    ChakraProvider: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    defaultSystem: {},
    Box,
    Flex,
    Text,
    Heading,
    Button,
    Input,
    Textarea,
    Grid,
    GridItem,
    Image,
    Container,
    Link,
    Alert,
    AlertIcon: () => null,
    AlertTitle,
    AlertDescription,
    Menu,
    MenuButton,
    MenuList,
    MenuItem,
    Spinner,
    CloseButton,
    IconButton,
    useColorMode: () => ({ colorMode: 'light', toggleColorMode: jest.fn() }),
    useBreakpointValue: () => 'base',
    useDisclosure: () => ({ isOpen: false, onOpen: jest.fn(), onClose: jest.fn(), onToggle: jest.fn() }),
    useToast: () => jest.fn(),
  };
});