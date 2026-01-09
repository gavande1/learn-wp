"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@/contexts/ThemeContext";

// GitHub Light theme for syntax highlighting
const githubLight: { [key: string]: React.CSSProperties } = {
	'code[class*="language-"]': {
		color: '#24292e',
		background: 'none',
		fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
		fontSize: '0.875rem',
		textAlign: 'left',
		whiteSpace: 'pre',
		wordSpacing: 'normal',
		wordBreak: 'normal',
		wordWrap: 'normal',
		lineHeight: '1.5',
		tabSize: 4,
		hyphens: 'none',
	},
	'pre[class*="language-"]': {
		color: '#24292e',
		background: '#f6f8fa',
		fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace",
		fontSize: '0.875rem',
		textAlign: 'left',
		whiteSpace: 'pre',
		wordSpacing: 'normal',
		wordBreak: 'normal',
		wordWrap: 'normal',
		lineHeight: '1.5',
		tabSize: 4,
		hyphens: 'none',
		padding: '1rem',
		margin: '0',
		overflow: 'auto',
		borderRadius: '8px',
		border: '1px solid #e1e4e8',
	},
	comment: { color: '#6a737d' },
	prolog: { color: '#6a737d' },
	doctype: { color: '#6a737d' },
	cdata: { color: '#6a737d' },
	punctuation: { color: '#24292e' },
	namespace: { opacity: 0.7 },
	property: { color: '#005cc5' },
	tag: { color: '#22863a' },
	boolean: { color: '#005cc5' },
	number: { color: '#005cc5' },
	constant: { color: '#005cc5' },
	symbol: { color: '#e36209' },
	deleted: { color: '#b31d28', backgroundColor: '#ffeef0' },
	selector: { color: '#6f42c1' },
	'attr-name': { color: '#6f42c1' },
	string: { color: '#032f62' },
	char: { color: '#032f62' },
	builtin: { color: '#e36209' },
	inserted: { color: '#22863a', backgroundColor: '#f0fff4' },
	operator: { color: '#d73a49' },
	entity: { color: '#22863a', cursor: 'help' },
	url: { color: '#032f62' },
	'.language-css .token.string': { color: '#032f62' },
	'.style .token.string': { color: '#032f62' },
	atrule: { color: '#d73a49' },
	'attr-value': { color: '#032f62' },
	keyword: { color: '#d73a49' },
	function: { color: '#6f42c1' },
	'class-name': { color: '#6f42c1' },
	regex: { color: '#032f62' },
	important: { color: '#d73a49', fontWeight: 'bold' },
	variable: { color: '#e36209' },
	bold: { fontWeight: 'bold' },
	italic: { fontStyle: 'italic' },
};

interface MarkdownRendererProps {
	content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
	const { theme } = useTheme();
	const syntaxTheme = theme === "light" ? githubLight : vscDarkPlus;

	return (
		<div className="markdown-content">
			<ReactMarkdown
				remarkPlugins={[remarkGfm]}
				components={{
					code({ node, className, children, ...props }) {
						const match = /language-(\w+)/.exec(className || "");
						const isInline = !match;
						
						if (isInline) {
							return (
								<code className={className} {...props}>
									{children}
								</code>
							);
						}
						
						return (
							<SyntaxHighlighter
								style={syntaxTheme}
								language={match[1]}
								PreTag="div"
								customStyle={{
									margin: "1rem 0",
									borderRadius: "8px",
									fontSize: "0.875rem",
									border: theme === "light" ? "1px solid #e1e4e8" : "none",
								}}
							>
								{String(children).replace(/\n$/, "")}
							</SyntaxHighlighter>
						);
					},
					table({ children }) {
						return (
							<div className="overflow-x-auto my-4">
								<table className="min-w-full">{children}</table>
							</div>
						);
					},
					a({ href, children }) {
						const linkClass = "text-[var(--primary)] hover:text-[var(--primary-dark)] underline";
						return (
							<a 
								href={href} 
								target={href?.startsWith("http") ? "_blank" : undefined}
								rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
								className={linkClass}
							>
								{children}
							</a>
						);
					},
				}}
			>
				{content}
			</ReactMarkdown>
		</div>
	);
}
