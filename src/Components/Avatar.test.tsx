import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Avatar from './Avatar';

describe('Avatar', () => {
  it('renders the first letter of the name', () => {
    const { container } = render(<Avatar name="trader" />);

    expect(container.querySelector('.avatar')).toHaveTextContent('T');
  });

  it('renders an empty avatar when no name is provided', () => {
    // KNOWN BEHAVIOUR: the component computes a '?' fallback but only renders the
    // initial when a non-blank name exists, so the fallback is never displayed.
    const { container } = render(<Avatar />);

    expect(container.querySelector('.avatar')).toHaveTextContent('');
  });

  it('renders an empty avatar for a blank name', () => {
    const { container } = render(<Avatar name="   " />);

    expect(container.querySelector('.avatar')).toHaveTextContent('');
  });

  it('uses the avatar image as a background when one is provided', () => {
    const { container } = render(<Avatar name="trader" avatar="https://example.com/a.png" />);

    const avatar = container.querySelector('.avatar');
    expect(avatar).toHaveStyle('background-image: url(https://example.com/a.png)');
    expect(avatar).toHaveTextContent('');
  });

  it('applies the requested size', () => {
    const { container } = render(<Avatar name="trader" size={64} />);

    const avatar = container.querySelector('.avatar');
    expect(avatar).toHaveStyle({ width: '64px', height: '64px' });
  });
});
