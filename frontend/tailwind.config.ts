import type { Config } from 'tailwindcss';
import { carthedgePreset } from './src/theme/preset';

export default {
  presets: [carthedgePreset],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
