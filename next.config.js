/** @type {import('next').NextConfig} */
const nextConfig = {
	turbopack: {
		root: __dirname,
	},
	// GitHub Pages works better with trailing slashes
	trailingSlash: true,
	// Enable static export for local testing (GitHub Actions injects this automatically)
	output: "export",
};

module.exports = nextConfig;
