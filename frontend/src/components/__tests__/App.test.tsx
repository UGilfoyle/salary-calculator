import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '../../contexts/AuthContext';
import App from '../../App';

// Mock axios
vi.mock('axios', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: {
            request: {
                use: vi.fn(),
                eject: vi.fn(),
            },
        },
    },
}));

describe('App Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render login page when user is not authenticated', () => {
        render(
            <AuthProvider>
                <App />
            </AuthProvider>
        );

        // Should show login form
        expect(screen.getByText(/login/i)).toBeInTheDocument();
    });

    it('should render salary calculator when user is authenticated', async () => {
        // Mock localStorage with user data
        const mockUser = {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            displayName: 'Test User',
        };

        localStorage.setItem('user', JSON.stringify(mockUser));
        localStorage.setItem('token', 'mock-token');

        render(
            <AuthProvider>
                <App />
            </AuthProvider>
        );

        await waitFor(() => {
            expect(screen.getByText(/SalaryCalc/i)).toBeInTheDocument();
        });
    });
});

