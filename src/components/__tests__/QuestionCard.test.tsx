import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuestionCard } from '../QuestionCard';

describe('QuestionCard', () => {
  it('renders multiple_choice options and answer', () => {
    render(
      <QuestionCard
        question={{ type: 'multiple_choice', question: 'Q?', options: ['a', 'b', 'c', 'd'], answer: 'b' }}
        showAnswer
      />
    );
    expect(screen.getByText('Q?')).toBeInTheDocument();
    expect(screen.getByText('b')).toBeInTheDocument();
  });

  it('renders essay rubric and sample answer', () => {
    render(
      <QuestionCard
        question={{ type: 'essay', question: 'Explain', rubric: ['clarity'], sampleAnswer: 'ans' }}
        showAnswer
      />
    );
    expect(screen.getByText('Explain')).toBeInTheDocument();
    expect(screen.getByText('clarity')).toBeInTheDocument();
    expect(screen.getByText(/Sample answer/)).toBeInTheDocument();
  });

  it('renders true_false', () => {
    render(<QuestionCard question={{ type: 'true_false', question: 'TF?', answer: true }} />);
    expect(screen.getByText('TF?')).toBeInTheDocument();
  });

  it('renders multi_select', () => {
    render(<QuestionCard question={{ type: 'multi_select', question: 'MS?', options: ['a', 'b'], answers: ['a'] }} />);
    expect(screen.getByText('MS?')).toBeInTheDocument();
  });
});
