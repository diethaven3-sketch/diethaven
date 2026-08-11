/** @type {import('next').NextConfig} */
const nextConfig = {
  // We already maintain a root-level CLAUDE.md as the single source of
  // truth; don't let Next.js scaffold a duplicate one under apps/web.
  agentRules: false,
};

export default nextConfig;
