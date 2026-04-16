import React from 'react';

export const BrowserRouter = ({ children }) => <>{children}</>;
export const MemoryRouter = ({ children }) => <>{children}</>;
export const Link = ({ children, to }) => <a href={to}>{children}</a>;
export const useNavigate = () => jest.fn();
export const useLocation = () => ({ pathname: '/', search: '' });
export const Routes = ({ children }) => <>{children}</>;
export const Route = ({ children }) => <>{children}</>;
export const Navigate = () => null;