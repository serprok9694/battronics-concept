import { Tooltip } from '@mantine/core';
import type { ReactNode } from 'react';
import { GLOSSARY, type GlossaryTerm } from '../../domain/glossary';

interface InfoTipProps {
  /** A glossary term, or free text for one-off explanations (e.g. units). */
  term?: GlossaryTerm;
  text?: string;
  size?: number;
}

/** ⓘ icon that explains a label on hover, tap or keyboard focus. */
export function InfoTip({ term, text, size = 12 }: InfoTipProps) {
  const label = text ?? (term ? GLOSSARY[term] : '');
  return (
    <Tooltip label={label} multiline w={280} withArrow openDelay={100} events={{ hover: true, focus: true, touch: true }}>
      <span
        role="img"
        tabIndex={0}
        aria-label={label}
        style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 3, color: '#898781', cursor: 'help' }}
        onClick={(e) => e.stopPropagation()} // inside clickable rows/cards: explain, don't navigate
      >
        <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <circle cx="8" cy="4.8" r="0.95" fill="currentColor" />
        </svg>
      </span>
    </Tooltip>
  );
}

/** A label followed by its ⓘ explanation. */
export function Term({ children, term, text }: { children: ReactNode } & InfoTipProps) {
  return (
    <span>
      {children}
      <InfoTip term={term} text={text} />
    </span>
  );
}
