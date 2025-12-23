# Custom Confirmation Dialog

A beautiful, custom confirmation dialog component built with React Context and Tailwind CSS, matching your app's design theme. Uses the existing Dialog UI components for consistency.

## Features

- 🎨 Matches your app's design theme (purple/red colors)
- 🎭 Uses existing Dialog UI components
- 🎯 Two variants: Default (purple) and Danger (red)
- ⚡ Promise-based API with async/await support
- 🔄 Context-based - accessible anywhere in the app
- 📱 Fully responsive
- ♿ Accessible with proper ARIA labels
- 🎪 Modal overlay with backdrop
- 🚫 Prevents accidental closes

## Setup

The `ConfirmationProvider` is already set up in `App.tsx` and wraps your entire application.

## Usage

### Import the Hook

```typescript
import { useConfirmation } from '@/components/ui/confirmation-dialog';
```

### Basic Confirmation

```typescript
function MyComponent() {
  const { confirm } = useConfirmation();

  const handleAction = async () => {
    const confirmed = await confirm({
      title: 'Confirm Action',
      message: 'Are you sure you want to proceed?',
    });

    if (confirmed) {
      // User clicked confirm
      console.log('Confirmed!');
    } else {
      // User clicked cancel or closed dialog
      console.log('Cancelled');
    }
  };

  return <button onClick={handleAction}>Do Something</button>;
}
```

### Danger Variant (For Destructive Actions)

```typescript
const handleDelete = async () => {
  const confirmed = await confirm({
    title: 'Delete Item',
    message: 'Are you sure you want to delete this item? This action cannot be undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    variant: 'danger', // Red button
  });

  if (confirmed) {
    await deleteItem();
  }
};
```

### Custom Button Text

```typescript
const handleLogout = async () => {
  const confirmed = await confirm({
    title: 'Logout',
    message: 'Are you sure you want to logout?',
    confirmText: 'Yes, Logout',
    cancelText: 'Stay',
  });

  if (confirmed) {
    logout();
  }
};
```

### Login Prompt

```typescript
const handleAddToCart = async () => {
  if (!user) {
    const confirmed = await confirm({
      title: 'Login Required',
      message: 'Please login to add items to cart. Do you want to login?',
      confirmText: 'Login',
      cancelText: 'Cancel',
    });

    if (confirmed) {
      navigate('/login');
    }
    return;
  }

  addToCart();
};
```

## API Reference

### `useConfirmation()`

Returns an object with the `confirm` function.

### `confirm(options)`

Shows a confirmation dialog and returns a Promise.

**Options:**
- `title?: string` - Dialog title (default: "Confirm Action")
- `message: string` - Dialog message (required)
- `confirmText?: string` - Confirm button text (default: "Confirm")
- `cancelText?: string` - Cancel button text (default: "Cancel")
- `variant?: 'default' | 'danger'` - Button color variant (default: "default")
  - `default` - Purple button (for normal actions)
  - `danger` - Red button (for destructive actions)
- `icon?: ReactNode` - Custom icon (optional, defaults to alert icons)

**Returns:** `Promise<boolean>`
- `true` - User clicked confirm
- `false` - User clicked cancel or closed dialog

## Examples in Codebase

### 1. Login Prompt (CategoriesSection.tsx)

```typescript
const handleAddToCart = async (categoryId: string, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (!user) {
    const confirmed = await confirm({
      title: 'Login Required',
      message: 'Please login to add items to cart. Do you want to login?',
      confirmText: 'Login',
      cancelText: 'Cancel',
    });
    
    if (confirmed) {
      navigate('/login');
    }
    return;
  }

  addToCartMutation.mutate(categoryId);
};
```

### 2. Remove Item (CartPage.tsx)

```typescript
const handleRemoveItem = async (categoryId: string) => {
  const confirmed = await confirm({
    title: 'Remove Item',
    message: 'Are you sure you want to remove this item from your cart?',
    confirmText: 'Remove',
    cancelText: 'Cancel',
    variant: 'danger',
  });
  
  if (confirmed) {
    removeItemMutation.mutate(categoryId);
  }
};
```

### 3. Clear Cart (CartPage.tsx)

```typescript
const handleClearCart = async () => {
  const confirmed = await confirm({
    title: 'Clear Cart',
    message: 'Are you sure you want to clear all items from your cart? This action cannot be undone.',
    confirmText: 'Clear All',
    cancelText: 'Cancel',
    variant: 'danger',
  });
  
  if (confirmed) {
    clearCartMutation.mutate();
  }
};
```

## Dialog Structure

Each confirmation dialog includes:

1. **Header:**
   - Icon (alert circle for default, alert triangle for danger)
   - Title text

2. **Body:**
   - Message text
   - Clean, readable typography

3. **Footer:**
   - Cancel button (left, outlined)
   - Confirm button (right, filled - purple or red)
   - Equal width on mobile, auto width on desktop

## Styling

- Uses your existing Dialog UI components
- Matches app theme colors (purple primary, red danger)
- Consistent with other dialogs in the app
- Responsive design with Tailwind CSS
- Icons from `react-icons/fi`

## Benefits

✅ **Consistent Design** - Matches your app's theme perfectly  
✅ **Easy to Use** - Simple async/await API  
✅ **Type Safe** - Full TypeScript support  
✅ **Accessible** - Proper ARIA labels and keyboard navigation  
✅ **Flexible** - Customizable text and variants  
✅ **Non-blocking** - Promise-based, doesn't block JavaScript  
✅ **Context-based** - Available anywhere in your app  
✅ **No External Dependencies** - Uses your existing UI components  

## Replaced Browser Confirms

All browser `confirm()` dialogs have been replaced with this custom dialog:

1. ✅ **CategoriesSection.tsx** - Login confirmation
2. ✅ **CartPage.tsx** - Remove item confirmation
3. ✅ **CartPage.tsx** - Clear cart confirmation

