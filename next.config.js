const { PHASE_DEVELOPMENT_SERVER } = require('next/constants')

/** @type {(phase: string) => import('next').NextConfig} */
module.exports = (phase) => ({
	// Keep the dev server's output apart from `next build` so running a build
	// while `next dev` is up cannot wipe the dev CSS/JS and break styling.
	distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next',
	async redirects() {
		return [{ source: '/', destination: '/dashboard', permanent: false }]
	},
})
