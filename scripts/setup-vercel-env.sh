#!/bin/bash

# Setup Vercel environment variables for Google Search Console readiness

set -e

echo "🚀 Setting up Vercel environment variables..."

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Install it with: npm i -g vercel"
    exit 1
fi

# Check if user is logged in
if [ ! -f ~/.vercel/auth.json ]; then
    echo "❌ Not logged in to Vercel. Run: vercel login"
    exit 1
fi

echo "📝 Setting NEXT_PUBLIC_SITE_URL..."
vercel env add NEXT_PUBLIC_SITE_URL --value "https://mrsanabolics.com" --environment production || {
    echo "⚠️  Variable may already exist. Updating..."
    vercel env rm NEXT_PUBLIC_SITE_URL --environment production --yes 2>/dev/null || true
    vercel env add NEXT_PUBLIC_SITE_URL --value "https://mrsanabolics.com" --environment production
}

echo "✅ Environment variable set!"
echo ""
echo "📋 Next steps:"
echo "  1. Push to main to trigger production deploy: git push origin main"
echo "  2. Wait for Vercel deployment to complete"
echo "  3. Verify with: curl https://mrsanabolics.com/sitemap.xml | grep -o 'https://[^<]*' | head -3"
echo ""
echo "Then submit to Google Search Console:"
echo "  - Domain: mrsanabolics.com"
echo "  - Verify DNS TXT record in Vercel"
echo "  - Submit sitemap: https://mrsanabolics.com/sitemap.xml"
