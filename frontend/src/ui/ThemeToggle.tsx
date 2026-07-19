import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/theme/ThemeProvider';
import { IconButton } from './Button';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <IconButton label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggle}>
      {theme === 'dark' ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
    </IconButton>
  );
}
