# Game Templates

This directory contains game templates that users can select when creating a new game.

## Adding a New Template

### 1. Create Template Directory

Create a new directory for your template:

```bash
mkdir -p public/templates/your-template-id
```

### 2. Add Images

Add these two required images to your template directory:

- `logo.png` - The logo/brand image (will be added as a game asset)
- `reference.png` - The target screenshot players need to recreate

Example:
```
public/templates/your-template-id/
  ├── logo.png
  └── reference.png
```

### 3. Add Template Configuration

Edit `src/data/templates.ts` and add your template to the `gameTemplates` array:

```typescript
{
  id: "your-template-id",
  name: "Your Template Name",
  description: "A brief description of what this template includes and its style.",
  logoUrl: "/templates/your-template-id/logo.png",
  referenceImageUrl: "/templates/your-template-id/reference.png",
  colors: [
    { name: "Primary", hex: "#FF0000" },
    { name: "Secondary", hex: "#00FF00" },
    // Add more colors...
  ],
  fonts: ["Font Name"],
  requirements: `Font:
- Font Name (System font or Google Font)

Colors:
• Color Name (#HEX) - Usage description
• Color Name (#HEX) - Usage description

Structure:
1. Header
2. Main content
3. Footer`,
  structure: [
    "Header",
    "Main content",
    "Footer",
  ],
}
```

### 4. Test Your Template

1. Restart the development server: `npm run dev`
2. Click "Create Game"
3. Your template should appear in the template selection screen
4. Select it to verify all fields are pre-filled correctly

## Template Fields

- **id**: Unique identifier (use kebab-case)
- **name**: Display name shown to users
- **description**: Brief description (1-2 sentences)
- **logoUrl**: Path to logo image (will be added as game asset)
- **referenceImageUrl**: Path to reference screenshot
- **colors**: Array of color objects with name and hex
- **fonts**: Array of font names (system or Google Fonts)
- **requirements**: Detailed text description for players
- **structure**: Array of main structural elements

## Example: Woodman Inc Template

See the existing Woodman Inc template in:
- Images: `public/templates/woodman-inc/`
- Config: `src/data/templates.ts`

This serves as a complete working example you can reference.
