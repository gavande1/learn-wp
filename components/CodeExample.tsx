"use client";

import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

interface CodeExampleProps {
	code: string;
	language?: string;
	title?: string;
	showLineNumbers?: boolean;
}

export default function CodeExample({ 
	code, 
	language = "php", 
	title,
	showLineNumbers = true 
}: CodeExampleProps) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	return (
		<div className="code-block my-4 overflow-hidden rounded-lg border border-zinc-800">
			{title && (
				<div className="flex items-center justify-between px-4 py-2 bg-zinc-800/50 border-b border-zinc-800">
					<span className="text-sm font-medium text-zinc-400">{title}</span>
					<div className="flex items-center gap-2">
						<span className="text-xs text-zinc-500 uppercase">{language}</span>
						<button
							onClick={copyToClipboard}
							className="p-1.5 rounded-md hover:bg-zinc-700 transition-colors"
							title="Copy code"
						>
							{copied ? (
								<Check size={14} className="text-green-500" />
							) : (
								<Copy size={14} className="text-zinc-500" />
							)}
						</button>
					</div>
				</div>
			)}
			{!title && (
				<div className="absolute top-2 right-2 z-10">
					<button
						onClick={copyToClipboard}
						className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
						title="Copy code"
					>
						{copied ? (
							<Check size={14} className="text-green-500" />
						) : (
							<Copy size={14} className="text-zinc-500" />
						)}
					</button>
				</div>
			)}
			<SyntaxHighlighter
				language={language}
				style={vscDarkPlus}
				showLineNumbers={showLineNumbers}
				customStyle={{
					margin: 0,
					padding: "1rem",
					background: "#1e1e2e",
					fontSize: "0.875rem",
				}}
				lineNumberStyle={{
					minWidth: "2.5em",
					paddingRight: "1em",
					color: "#4a4a5a",
					userSelect: "none",
				}}
			>
				{code.trim()}
			</SyntaxHighlighter>
		</div>
	);
}
