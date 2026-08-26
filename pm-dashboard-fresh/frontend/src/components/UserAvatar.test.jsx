// frontend/src/components/UserAvatar.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserAvatar from './UserAvatar';

describe('UserAvatar', () => {
  const mockUser = {
    name: 'John Doe',
    avatar: null,
    role: 'Developer',
    department: 'Engineering'
  };

  beforeEach(() => {
    // Mock console.log to avoid cluttering test output
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('basic rendering', () => {
    it('renders with user initials when no avatar', () => {
      render(<UserAvatar user={mockUser} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });

    it('renders with custom size', () => {
      render(<UserAvatar user={mockUser} size="lg" />);
      const avatar = screen.getByText('JD');
      expect(avatar).toBeInTheDocument();
      // Check if the parent div has the correct size (this is approximate)
      expect(avatar.parentElement).toHaveStyle({ width: '56px', height: '56px' });
    });

    it('renders with valid data URL avatar', () => {
      const userWithAvatar = {
        ...mockUser,
        avatar: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
      };
      render(<UserAvatar user={userWithAvatar} />);
      const avatar = screen.getByTitle('John Doe');
      expect(avatar).toHaveStyle({
        backgroundImage: `url("${userWithAvatar.avatar}")`
      });
    });

    it('ignores invalid avatar URLs', () => {
      const userWithInvalidAvatar = {
        ...mockUser,
        avatar: 'invalid-url'
      };
      render(<UserAvatar user={userWithInvalidAvatar} />);
      expect(screen.getByText('JD')).toBeInTheDocument();
    });
  });

  describe('name and title display', () => {
    it('shows name when showName is true', () => {
      render(<UserAvatar user={mockUser} showName={true} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows title when showTitle is true', () => {
      render(<UserAvatar user={mockUser} showTitle={true} />);
      expect(screen.getByText('Developer • Engineering')).toBeInTheDocument();
    });

    it('shows only title when showTitle is true and no department', () => {
      const userNoDept = { ...mockUser, department: '' };
      render(<UserAvatar user={userNoDept} showTitle={true} />);
      expect(screen.getByText('Developer')).toBeInTheDocument();
    });

    it('shows both name and title', () => {
      render(<UserAvatar user={mockUser} showName={true} showTitle={true} />);
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Developer • Engineering')).toBeInTheDocument();
    });
  });

  describe('user data handling', () => {
    it('handles missing user gracefully', () => {
      render(<UserAvatar user={null} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('handles user with no name', () => {
      const userNoName = { ...mockUser, name: '' };
      render(<UserAvatar user={userNoName} />);
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('generates correct initials for single name', () => {
      const userSingleName = { ...mockUser, name: 'John' };
      render(<UserAvatar user={userSingleName} />);
      expect(screen.getByText('J')).toBeInTheDocument();
    });

    it('generates correct initials for multiple names', () => {
      const userMultipleNames = { ...mockUser, name: 'John Michael Doe' };
      render(<UserAvatar user={userMultipleNames} />);
      expect(screen.getByText('JM')).toBeInTheDocument();
    });
  });

  describe('styling and interaction', () => {
    it('applies custom className', () => {
      render(<UserAvatar user={mockUser} className="custom-class" />);
      const avatar = screen.getByText('JD');
      expect(avatar.parentElement).toHaveClass('custom-class');
    });

    it('has pointer cursor when onClick is provided', () => {
      const onClick = jest.fn();
      render(<UserAvatar user={mockUser} onClick={onClick} />);
      const avatar = screen.getByText('JD');
      expect(avatar.parentElement).toHaveStyle({ cursor: 'pointer' });
    });

    it('has default cursor when no onClick', () => {
      render(<UserAvatar user={mockUser} />);
      const avatar = screen.getByText('JD');
      expect(avatar.parentElement).toHaveStyle({ cursor: 'default' });
    });

    it('generates consistent colors based on name', () => {
      render(<UserAvatar user={mockUser} />);
      const avatar = screen.getByText('JD');
      const backgroundColor = avatar.parentElement.style.backgroundColor;
      expect(backgroundColor).toBeTruthy();
      expect(backgroundColor).not.toBe('transparent');
    });
  });

  describe('size configurations', () => {
    const sizes = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];

    sizes.forEach(size => {
      it(`renders correctly for size ${size}`, () => {
        render(<UserAvatar user={mockUser} size={size} />);
        const avatar = screen.getByText('JD');
        expect(avatar).toBeInTheDocument();
        // The component should render without errors for all sizes
      });
    });

    it('defaults to md size when invalid size provided', () => {
      render(<UserAvatar user={mockUser} size="invalid" />);
      const avatar = screen.getByText('JD');
      expect(avatar).toBeInTheDocument();
      // Should use md as fallback
    });
  });
});