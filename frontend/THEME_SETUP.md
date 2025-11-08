# Theme Dependencies Installation

To set up the theme system, run the following commands in your terminal:

```bash
# Install required dependencies
npm install -D tailwindcss postcss autoprefixer
npm install tailwindcss-animate class-variance-authority clsx tailwind-merge
npm install next-themes
npm install @radix-ui/react-slot @radix-ui/react-dropdown-menu

# Initialize Tailwind CSS
npx tailwindcss init -p

# The tailwind.config.js and globals.css files have already been created and configured
# Make sure to import the theme CSS in your main.tsx or App.tsx file:
# import './styles/globals.css'
```

## Theme System Usage

The theme system provides:

1. A ThemeProvider context that manages theme state
2. CSS variables for consistent styling
3. Utility classes for dark/light mode
4. Smooth transitions between themes

### Using the Theme

```tsx
import { useTheme } from '../contexts/ThemeContext';

function MyComponent() {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <div className="bg-background text-foreground">
      <button onClick={toggleTheme}>
        Toggle {isDark ? 'Light' : 'Dark'} Mode
      </button>
    </div>
  );
}
```

### Available Theme Variables

```css
/* Access these variables using Tailwind classes */
.bg-background
.text-foreground
.border-border
.bg-primary
.text-primary-foreground
.bg-secondary
.text-secondary-foreground
.bg-muted
.text-muted-foreground
.bg-accent
.text-accent-foreground
.bg-destructive
.text-destructive-foreground
```

### Components

All Shadcn/UI components have been configured to use these theme variables by default. For custom components, use the Tailwind classes that reference these variables for consistent theming.