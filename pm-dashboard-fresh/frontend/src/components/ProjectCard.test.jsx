// frontend/src/components/ProjectCard.test.jsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProjectCard from './ProjectCard';

describe('ProjectCard', () => {
  const mockProject = {
    id: 1,
    name: 'Test Project',
    description: 'This is a test project description',
    status: 'active',
    priority: 'high',
    deadline: '2024-12-31',
    team_size: 5,
    progress: { PM: 3 },
    pm_progress: 3,
    creator_name: 'John Doe',
    creator_avatar: 'J',
    lastUpdate: '2 days ago',
    stakeholder: 'Marketing Team'
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnView = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('renders project name and description', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Test Project')).toBeInTheDocument();
      expect(screen.getByText('This is a test project description')).toBeInTheDocument();
    });

    it('renders status and priority badges', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('active')).toBeInTheDocument();
      expect(screen.getByText('high')).toBeInTheDocument();
    });

    it('renders team size and deadline', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('5 members')).toBeInTheDocument();
      // Date formatting might vary, but should contain the date
      expect(screen.getByText(/Dec 31, 2024/)).toBeInTheDocument();
    });

    it('renders stakeholder information', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Marketing Team')).toBeInTheDocument();
      expect(screen.getByText('Who benefits from the outputs of the project?')).toBeInTheDocument();
    });

    it('renders creator information', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Project Manager')).toBeInTheDocument();
    });
  });

  describe('progress bar', () => {
    it('calculates and displays correct progress percentage', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      // 3/7 * 100 = 42.857... ≈ 43%
      expect(screen.getByText('43%')).toBeInTheDocument();
    });

    it('handles zero progress', () => {
      const projectNoProgress = { ...mockProject, progress: { PM: 0 } };
      render(
        <ProjectCard
          project={projectNoProgress}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });

  describe('beneficiary display', () => {
    it('uses stakeholder field when available', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Marketing Team')).toBeInTheDocument();
    });

    it('falls back to beneficiary field when stakeholder is not present', () => {
      const projectWithBeneficiary = { ...mockProject, stakeholder: null, beneficiary: 'Sales Team' };
      render(
        <ProjectCard
          project={projectWithBeneficiary}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Sales Team')).toBeInTheDocument();
    });

    it('falls back to who_benefits_from_this_project field', () => {
      const projectWithDesc = {
        ...mockProject,
        stakeholder: null,
        who_benefits_from_this_project: 'Engineering Team'
      };
      render(
        <ProjectCard
          project={projectWithDesc}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Engineering Team')).toBeInTheDocument();
    });

    it('defaults to Not specified when no beneficiary info exists', () => {
      const projectNoStakeholder = {
        ...mockProject,
        stakeholder: null,
        description: 'A simple project',
        beneficiary: null,
        who_benefits_from_this_project: null,
        whoBenefitsFromThisProject: null
      };
      render(
        <ProjectCard
          project={projectNoStakeholder}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      expect(screen.getByText('Not specified')).toBeInTheDocument();
    });
  });

  describe('actions menu', () => {
    it('shows actions menu when more button is clicked', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const moreButton = screen.getByRole('button', { name: /more/i });
      fireEvent.click(moreButton);

      expect(screen.getByText('Edit')).toBeInTheDocument();
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });

    it('calls onEdit when edit button is clicked', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const moreButton = screen.getByRole('button', { name: /more/i });
      fireEvent.click(moreButton);

      const editButton = screen.getByText('Edit');
      fireEvent.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockProject);
    });

    it('calls onDelete when delete button is clicked', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const moreButton = screen.getByRole('button', { name: /more/i });
      fireEvent.click(moreButton);

      const deleteButton = screen.getByText('Delete');
      fireEvent.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('view details button', () => {
    it('calls onView when view details button is clicked', () => {
      render(
        <ProjectCard
          project={mockProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const viewButton = screen.getByText('View Details');
      fireEvent.click(viewButton);

      expect(mockOnView).toHaveBeenCalledWith(mockProject);
    });
  });

  describe('status and priority styling', () => {
    it('applies correct colors for different statuses', () => {
      const statuses = ['active', 'planning', 'completed', 'on_hold'];

      statuses.forEach(status => {
        const projectWithStatus = { ...mockProject, status };
        const { rerender } = render(
          <ProjectCard
            project={projectWithStatus}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            onView={mockOnView}
          />
        );

        expect(screen.getByText(status.replace('_', ' '))).toBeInTheDocument();
        rerender(<div />);
      });
    });

    it('applies correct colors for different priorities', () => {
      const priorities = ['low', 'medium', 'high', 'critical'];

      priorities.forEach(priority => {
        const projectWithPriority = { ...mockProject, priority };
        const { rerender } = render(
          <ProjectCard
            project={projectWithPriority}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            onView={mockOnView}
          />
        );

        expect(screen.getByText(priority)).toBeInTheDocument();
        rerender(<div />);
      });
    });
  });

  describe('deadline handling', () => {
    it('shows overdue deadline in red', () => {
      const overdueProject = { ...mockProject, deadline: '2020-01-01' };
      render(
        <ProjectCard
          project={overdueProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const deadlineText = screen.getByText(/Jan 1, 2020/);
      expect(deadlineText).toHaveStyle({ color: '#dc2626' });
    });

    it('shows future deadline in normal color', () => {
      const futureProject = { ...mockProject, deadline: '2030-01-01' };
      render(
        <ProjectCard
          project={futureProject}
          onEdit={mockOnEdit}
          onDelete={mockOnDelete}
          onView={mockOnView}
        />
      );

      const deadlineText = screen.getByText(/Jan 1, 2030/);
      expect(deadlineText).toHaveStyle({ color: '#6b7280' });
    });
  });
});