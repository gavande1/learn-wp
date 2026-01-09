/** @type {import('next').NextConfig} */
const nextConfig = {
	turbopack: {
		root: __dirname,
	},
	// GitHub Pages works better with trailing slashes
	trailingSlash: true,
};

module.exports = nextConfig;
