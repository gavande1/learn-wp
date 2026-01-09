import type { Metadata } from "next";
import { ThemeProvider } from "@/contexts/ThemeContext";
import "./globals.css";

export const metadata: Metadata = {
	title: "WordPress Certification Tutorial",
	description: "Study guide for the Advanced Professional WordPress Developer certification exam",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script
					dangerouslySetInnerHTML={{
						__html: `
							(function() {
								try {
									var theme = localStorage.getItem('wp-cert-theme');
									if (!theme) {
										theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
									}
									document.documentElement.setAttribute('data-theme', theme);
								} catch (e) {}
							})();
						`,
					}}
				/>
			</head>
			<body className="antialiased">
				<ThemeProvider>
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}
