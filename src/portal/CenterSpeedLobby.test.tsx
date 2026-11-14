import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
vi.mock('@/integrations/supabase/client', () => ({ supabase: {} }));
import { CenterSpeedLobby } from './CenterSpeedLobby';

const render = (runsLeft: number | null) => renderToStaticMarkup(
  <QueryClientProvider client={new QueryClient()}><CenterSpeedLobby runs={[]} runsLeft={runsLeft} onStart={() => {}} /></QueryClientProvider>,
);
const startButton = (html: string) => html.match(/<button[^>]*>(?:(?!<\/button>).)*Start session<\/button>/)?.[0] ?? '';

describe('speed lobby allowance', () => {
  it('a free user with no runs left sees 0 of 10 and a disabled Start', () => {
    const html = render(0);
    expect(html).toContain('0 of 10 left today');
    expect(startButton(html)).toMatch(/disabled=""/);
  });
  it('shows what is left and keeps Start on', () => {
    const html = render(4);
    expect(html).toContain('4 of 10 left today');
    expect(startButton(html)).not.toMatch(/disabled=""/);
  });
  it('no allowance (null, everyone not free) shows no line and keeps Start on', () => {
    const html = render(null);
    expect(html).not.toContain('left today');
    expect(startButton(html)).toContain('Start session');
    expect(startButton(html)).not.toMatch(/disabled=""/);
  });
});
