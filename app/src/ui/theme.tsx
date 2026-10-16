/* Dark (the default), light, or following the phone. The colours for each are in index.css (data-theme on
   <html>); the choice is kept on this phone. */
import { useState } from 'react';
import { pref, setPref } from '../model/store';
import { isNative } from '../native';

export type Theme = 'auto' | 'light' | 'dark';

export function applyTheme(t: Theme = pref<Theme>('theme', 'dark')) {
  const root = document.documentElement;
  if (t === 'auto') delete root.dataset.theme; else root.dataset.theme = t;
  /* the status bar's text follows: light text on a dark page */
  if (isNative) void import('@capacitor/status-bar').then(({ StatusBar, Style }) =>
    StatusBar.setStyle({ style: t === 'dark' ? Style.Dark : t === 'light' ? Style.Light : Style.Default })).catch(() => {});
}

export function ThemeSwitch() {
  const [t, setT] = useState<Theme>(() => pref<Theme>('theme', 'dark'));
  const pick = (v: Theme) => { setT(v); setPref('theme', v); applyTheme(v); };
  return (
    <div className="themesw" role="group" aria-label="Appearance">
      <span className="lbl" style={{ margin: 0 }}>Appearance</span>
      {(['dark', 'light', 'auto'] as const).map(v => (
        <button key={v} type="button" className="chipbtn plain" aria-pressed={t === v} onClick={() => pick(v)}>{v === 'auto' ? 'Like the phone' : v === 'light' ? 'Light' : 'Dark'}</button>
      ))}
    </div>
  );
}
