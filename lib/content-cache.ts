// In-memory content cache for markdown files
const contentCache = new Map<string, string>();
const pendingRequests = new Map<string, Promise<string>>();

export function getCacheKey(sectionId: string, topicId: string): string {
	return `${sectionId}/${topicId}`;
}

export function getCachedContent(sectionId: string, topicId: string): string | null {
	const key = getCacheKey(sectionId, topicId);
	return contentCache.get(key) || null;
}

export async function fetchContent(sectionId: string, topicId: string, fallbackTitle?: string): Promise<string> {
	const key = getCacheKey(sectionId, topicId);
	
	// Return cached content if available
	const cached = contentCache.get(key);
	if (cached) {
		return cached;
	}
	
	// Return pending request if one exists (avoid duplicate fetches)
	const pending = pendingRequests.get(key);
	if (pending) {
		return pending;
	}
	
	// Create new fetch request
	const request = (async () => {
		try {
			// Detect basePath from current location (for GitHub Pages compatibility)
			// If pathname starts with /learn-wp, use that as basePath
			let basePath = '';
			if (typeof window !== 'undefined') {
				const pathname = window.location.pathname;
				// Extract basePath: if pathname is /learn-wp/..., basePath is /learn-wp
				// Otherwise, it's empty (for local development)
				const pathParts = pathname.split('/').filter(Boolean);
				if (pathParts[0] === 'learn-wp') {
					basePath = '/learn-wp';
				}
			}
			
			const contentPath = `${basePath}/content/${sectionId}/${topicId}.md`;
			const response = await fetch(contentPath);
			if (response.ok) {
				const text = await response.text();
				contentCache.set(key, text);
				return text;
			} else {
				// Log for debugging (only in development)
				if (process.env.NODE_ENV === 'development') {
					console.warn(`Failed to fetch content from ${contentPath}: ${response.status}`);
				}
			}
		} catch (error) {
			// Log for debugging (only in development)
			if (process.env.NODE_ENV === 'development') {
				console.error('Error fetching content:', error);
			}
		}
		
		const fallback = `# ${fallbackTitle || 'Topic'}\n\nContent coming soon...`;
		contentCache.set(key, fallback);
		return fallback;
	})();
	
	pendingRequests.set(key, request);
	
	try {
		const result = await request;
		return result;
	} finally {
		pendingRequests.delete(key);
	}
}

export function prefetchContent(sectionId: string, topicId: string, fallbackTitle?: string): void {
	// Fire and forget - prefetch without waiting
	fetchContent(sectionId, topicId, fallbackTitle);
}

export function clearCache(): void {
	contentCache.clear();
}
