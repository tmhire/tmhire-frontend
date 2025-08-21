# SearchableDropdown Component

A reusable, searchable dropdown component built with React, TypeScript, and Framer Motion. This component provides a modern, accessible dropdown interface with search functionality, keyboard navigation, and smooth animations.

## Features

- 🔍 **Search Functionality**: Real-time filtering of options as you type
- ⌨️ **Keyboard Navigation**: Support for Enter, Escape, and arrow keys
- 🎨 **Modern UI**: Clean design with dark mode support
- ♿ **Accessibility**: ARIA attributes and keyboard support
- 🎭 **Smooth Animations**: Framer Motion animations for better UX
- 🧹 **Clear Button**: Easy way to reset selection
- 🚫 **Disabled State**: Support for disabled state
- ❌ **Error Handling**: Built-in error display
- 📱 **Responsive**: Works on all screen sizes

## Usage

### Basic Example

```tsx
import SearchableDropdown from "@/components/form/SearchableDropdown";

interface User {
  id: string;
  name: string;
  email: string;
}

const users: User[] = [
  { id: "1", name: "John Doe", email: "john@example.com" },
  { id: "2", name: "Jane Smith", email: "jane@example.com" },
];

function MyComponent() {
  const [selectedUser, setSelectedUser] = useState("");

  return (
    <SearchableDropdown
      options={users}
      value={selectedUser}
      onChange={setSelectedUser}
      getOptionLabel={(user: User) => user.name}
      getOptionValue={(user: User) => user.id}
      placeholder="Select a user"
      label="Select User"
    />
  );
}
```

### With Required Field

```tsx
<SearchableDropdown
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getOptionLabel={(user: User) => user.name}
  getOptionValue={(user: User) => user.id}
  placeholder="Select a user"
  label="Select User"
  required
/>
```

### With Error State

```tsx
<SearchableDropdown
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getOptionLabel={(user: User) => user.name}
  getOptionValue={(user: User) => user.id}
  placeholder="Select a user"
  label="Select User"
  error="Please select a user"
/>
```

### Disabled State

```tsx
<SearchableDropdown
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getOptionLabel={(user: User) => user.name}
  getOptionValue={(user: User) => user.id}
  placeholder="Select a user"
  label="Select User"
  disabled={true}
/>
```

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `options` | `T[]` | ✅ | - | Array of options to display |
| `value` | `string` | ✅ | - | Currently selected value |
| `onChange` | `(value: string) => void` | ✅ | - | Callback when selection changes |
| `getOptionLabel` | `(option: T) => string` | ✅ | - | Function to get display label for option |
| `getOptionValue` | `(option: T) => string` | ✅ | - | Function to get value for option |
| `placeholder` | `string` | ❌ | "Select an option" | Placeholder text when no option is selected |
| `label` | `string` | ❌ | - | Label above the dropdown |
| `className` | `string` | ❌ | "" | Additional CSS classes |
| `disabled` | `boolean` | ❌ | `false` | Whether the dropdown is disabled |
| `error` | `string` | ❌ | - | Error message to display |
| `required` | `boolean` | ❌ | `false` | Whether the field is required |

## Generic Type

The component is generic, so you can use it with any data type:

```tsx
// For simple string arrays
<SearchableDropdown<string>
  options={["Option 1", "Option 2"]}
  value={selectedOption}
  onChange={setSelectedOption}
  getOptionLabel={(option: string) => option}
  getOptionValue={(option: string) => option}
/>

// For complex objects
<SearchableDropdown<User>
  options={users}
  value={selectedUser}
  onChange={setSelectedUser}
  getOptionLabel={(user: User) => user.name}
  getOptionValue={(user: User) => user.id}
/>
```

## Keyboard Navigation

- **Enter**: Select the first filtered option
- **Escape**: Close the dropdown
- **Click outside**: Close the dropdown
- **Search input**: Automatically focuses when dropdown opens

## Styling

The component uses Tailwind CSS classes and follows the design system. It automatically adapts to dark/light mode based on your theme context.

## Accessibility

- Proper ARIA attributes (`aria-haspopup`, `aria-expanded`)
- Keyboard navigation support
- Screen reader friendly
- Focus management

## Examples

See `SearchableDropdownExample.tsx` for more usage examples and patterns.

