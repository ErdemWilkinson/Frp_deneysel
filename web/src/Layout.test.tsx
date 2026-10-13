import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
import { Split } from './Split';
import { Tabs } from './Tabs';

beforeEach(() => window.localStorage.clear());

const split = () => render(
  <Split id="t" initial={[30, 40, 30]} labels={['Kitap', 'Masa', 'Zar']}>
    <p>a</p><p>b</p><p>c</p>
  </Split>,
);
const widths = () => screen.getAllByRole('group').map((p) => (p.parentElement as HTMLElement).style.flexGrow);
const handle = (name: RegExp) => screen.getByRole('separator', { name });

it('ok tuşlarıyla iki komşu bölmenin genişliğini değiştirir ve hatırlar', () => {
  const first = split();
  expect(widths()).toEqual(['30', '40', '30']);
  fireEvent.keyDown(handle(/Kitap ile Masa/), { key: 'ArrowRight' });
  fireEvent.keyDown(handle(/Masa ile Zar/), { key: 'ArrowLeft' });
  expect(widths()).toEqual(['32', '36', '32']);
  first.unmount();
  split();
  expect(widths()).toEqual(['32', '36', '32']);
});

it('bölmeyi en küçük genişliğin altına indirmez; Enter başlangıca döndürür', () => {
  split();
  for (let n = 0; n < 30; n += 1) fireEvent.keyDown(handle(/Kitap ile Masa/), { key: 'ArrowLeft' });
  expect(widths()).toEqual(['14', '56', '30']);
  fireEvent.keyDown(handle(/Kitap ile Masa/), { key: 'Enter' });
  expect(widths()).toEqual(['30', '40', '30']);
});

it('sürükleyince genişliği fare kadar kaydırır', () => {
  split();
  const root = screen.getAllByRole('group')[0]!.parentElement!.parentElement!;
  root.getBoundingClientRect = () => ({ width: 1000 }) as DOMRect;
  fireEvent.pointerDown(handle(/Kitap ile Masa/), { clientX: 300 });
  fireEvent.pointerMove(window, { clientX: 400 });
  fireEvent.pointerUp(window);
  fireEvent.pointerMove(window, { clientX: 900 });
  expect(widths()).toEqual(['40', '30', '30']);
});

it('bozuk kayıtlı genişliği yok sayar', () => {
  window.localStorage.setItem('masa.split.t', '[90, 5, 5]');
  split();
  expect(widths()).toEqual(['30', '40', '30']);
});

it('sekmeler yalnızca açık olanın içeriğini gösterir', async () => {
  const onChange = vi.fn();
  const tabs = [
    { key: 'a', label: 'Savaş', content: <p>savaş içeriği</p> },
    { key: 'b', label: 'Harita', content: <p>harita içeriği</p> },
  ];
  const { rerender } = render(<Tabs label="Masa" tabs={tabs} active="a" onChange={onChange} />);
  expect(screen.getByRole('tabpanel')).toHaveTextContent('savaş içeriği');
  expect(screen.queryByText('harita içeriği')).toBeNull();
  await userEvent.click(screen.getByRole('tab', { name: 'Harita' }));
  expect(onChange).toHaveBeenCalledWith('b');
  rerender(<Tabs label="Masa" tabs={tabs} active="b" onChange={onChange} />);
  expect(screen.getByRole('tab', { name: 'Harita' })).toHaveAttribute('aria-selected', 'true');
  fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' });
  expect(onChange).toHaveBeenLastCalledWith('a');
});
