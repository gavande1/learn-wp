# WordPress Certification Tutorial

A comprehensive, interactive study guide for the **Advanced Professional WordPress Developer** certification exam. This Next.js application provides detailed tutorials covering all 8 exam sections with progress tracking, markdown content rendering, and a modern, responsive interface.

🌐 **Live Demo**: [https://gavande1.github.io/learn-wp/](https://gavande1.github.io/learn-wp/)

## 🎯 Features

- **8 Comprehensive Exam Sections** covering all certification topics
- **60+ Detailed Topics** with in-depth explanations and exam tips
- **Interactive Progress Tracking** - mark topics as complete and track your overall progress
- **Markdown Content Rendering** - beautifully formatted content with syntax highlighting
- **Responsive Design** - works seamlessly on desktop, tablet, and mobile devices
- **Dark/Light Theme Support** - comfortable reading in any lighting condition
- **Content Caching** - fast content loading with intelligent prefetching
- **Navigation** - easy navigation between topics with previous/next buttons
- **Progress Dashboard** - visualize your learning progress across all sections

## 📚 Exam Sections

1. **WordPress Core** (15%) - Hooks, APIs, core systems, and WordPress fundamentals
2. **Custom Development** (15%) - Building custom solutions, blocks, themes, and plugins
3. **Security** (15%) - Security best practices, vulnerability prevention, and secure coding
4. **Performance** (15%) - Optimization, caching, and efficient resource usage
5. **Testing & Quality Assurance** (10%) - Unit, integration, and E2E testing
6. **Debugging & Troubleshooting** (10%) - Diagnosing and resolving WordPress issues
7. **Scalability & Architecture** (10%) - Designing scalable WordPress solutions
8. **Disaster Recovery** (10%) - Backup and recovery strategies

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) with App Router and Turbopack
- **React**: React 19.2+
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Content**: Markdown files with [react-markdown](https://github.com/remarkjs/react-markdown)
- **Syntax Highlighting**: [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Markdown Extensions**: [remark-gfm](https://github.com/remarkjs/remark-gfm) for GitHub Flavored Markdown

## 📁 Project Structure

```
├── app/                          # Next.js App Router pages
│   ├── [section]/               # Dynamic section routes
│   │   ├── [topic]/             # Dynamic topic routes
│   │   │   └── page.tsx         # Topic detail page
│   │   └── page.tsx             # Section overview page
│   ├── progress/                # Progress tracking page
│   ├── layout.tsx               # Root layout with theme provider
│   ├── page.tsx                 # Home page
│   └── globals.css              # Global styles
├── components/                   # React components
│   ├── CodeExample.tsx          # Code block component
│   ├── MarkdownRenderer.tsx     # Markdown content renderer
│   ├── Navigation.tsx            # Sidebar navigation
│   ├── ProgressTracker.tsx      # Progress visualization
│   ├── SectionCard.tsx          # Section card component
│   ├── TopicCard.tsx            # Topic card component
│   └── TopicLink.tsx            # Topic navigation link
├── contexts/                     # React contexts
│   └── ThemeContext.tsx         # Theme management
├── lib/                          # Utility libraries
│   ├── content-cache.ts         # Content caching and fetching
│   ├── exam-data.ts             # Exam structure and metadata
│   ├── progress.ts              # Progress tracking logic
│   └── utils.ts                 # General utilities
├── public/                       # Static assets
│   └── content/                 # Markdown content files
│       ├── wordpress-core/      # WordPress Core topics
│       ├── custom-development/  # Custom Development topics
│       ├── security/            # Security topics
│       ├── performance/        # Performance topics
│       ├── testing-quality/    # Testing & QA topics
│       ├── debugging-troubleshooting/ # Debugging topics
│       ├── scalability-architecture/ # Scalability topics
│       └── disaster-recovery/   # Disaster Recovery topics
├── types/                        # TypeScript type definitions
│   └── exam.ts                  # Exam data types
├── package.json                  # Dependencies and scripts
├── tailwind.config.ts           # Tailwind CSS configuration
├── tsconfig.json                # TypeScript configuration
└── next.config.js               # Next.js configuration
```

## 🚀 Getting Started

### Prerequisites

- Node.js 20.9.0+ and npm (or yarn/pnpm)
- Git

> **Note**: This project uses Next.js 16 with React 19, which requires Node.js 20.9.0 or later. Make sure you have the correct Node.js version installed.

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd learning
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
npm start
```

## 📝 Content Management

### Adding New Topics

1. **Add topic metadata** in `lib/exam-data.ts`:
   ```typescript
   {
     id: "topic-id",
     title: "Topic Title"
   }
   ```

2. **Create markdown file** in `public/content/{section-id}/{topic-id}.md`:
   ```markdown
   # Topic Title
   
   Content goes here...
   ```

### Content Structure

Each markdown file can include:
- **Headings** - Use `#` for main title, `##` for sections
- **Code blocks** - Use triple backticks with language identifier
- **Lists** - Bullet points and numbered lists
- **Exam Tips** - Use `## Exam Points` section for exam-specific tips
- **Links** - Standard markdown link syntax

### Exam Points Format

The application supports exam points with explanations:

```markdown
## Exam Points

- **Point Title**: Detailed explanation of the exam point...
- **Another Point**: Another detailed explanation...
```

## 🎨 Customization

### Theme

The application uses CSS variables for theming. Modify `app/globals.css` to customize colors:

```css
:root {
  --background: #ffffff;
  --foreground: #000000;
  --primary: #3b82f6;
  /* ... */
}
```

### Styling

The project uses Tailwind CSS. Modify `tailwind.config.ts` to customize the design system.

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server with Turbopack (Next.js 16 default)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint (v9+)

### Recent Updates

- **Next.js 16**: Upgraded to the latest version with Turbopack as the default bundler
- **React 19**: Upgraded to React 19.2+ for improved performance and new features
- **ESLint 9**: Updated to ESLint 9 for better compatibility with Next.js 16

### Code Style

- Use TypeScript for type safety
- Follow Next.js App Router conventions
- Use 4 tabs for indentation (not spaces)
- Follow existing code patterns and practices
- React 19 features: Uses `useTransition` for smooth content loading

## 📊 Progress Tracking

Progress is stored in browser localStorage with the key `wordpress-cert-progress`. The data structure:

```typescript
{
  "section-id": {
    "topic-id": true
  }
}
```

## 🚢 Deployment

**Live Application**: The application is deployed and available at [https://gavande1.github.io/learn-wp/](https://gavande1.github.io/learn-wp/)

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Deploy automatically

### Other Platforms

The application can be deployed to any platform that supports Next.js:
- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## 📄 License

This project is for educational purposes. Check the license file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For issues or questions, please open an issue in the repository.

---

**Note**: This is a study guide for the Advanced Professional WordPress Developer certification exam. It is not affiliated with WordPress.org or the certification program.
