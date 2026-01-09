import Link from "next/link";
import Navigation from "@/components/Navigation";
import { Home } from "lucide-react";

export default function NotFound() {
	return (
		<div className="min-h-screen bg-[var(--background)]">
			<Navigation />
			<main className="lg:ml-72 pt-16 lg:pt-0 flex items-center justify-center min-h-screen">
				<div className="text-center max-w-md mx-auto px-4">
					<h1 className="text-6xl font-bold text-[var(--foreground)] mb-4">404</h1>
					<h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">Page Not Found</h2>
					<p className="text-[var(--foreground-muted)] mb-8">
						The page you&apos;re looking for doesn&apos;t exist or has been moved.
					</p>
					<Link
						href="/"
						className="inline-flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
					>
						<Home size={20} />
						<span>Go to Home</span>
					</Link>
				</div>
			</main>
		</div>
	);
}
