/** Initial canvas / RF settings (separate file so Vite Fast Refresh stays happy with `SettingsModal.jsx`). */
export const DEFAULT_SETTINGS = {
  minZoom: 0.1,
  maxZoom: 4,
  bgVariant: 'dots', // 'dots' | 'lines' | 'cross'
  snapToGrid: false,
  snapGrid: [15, 15],
  edgeType: 'smoothstep',
};
