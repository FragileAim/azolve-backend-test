/**
 * SEO Suite API Routes
 * POST /api/seo/analyze-website   — fetches a client's website, extracts on-page
 *                                    SEO signals, scores them, and asks the AI
 *                                    for prioritized, plain-English suggestions.
 * POST /api/seo/optimize-social   — scores a social media caption against
 *                                    platform best practices and asks the AI
 *                                    for an improved version + hashtags.
 *
 * No paid third-party SEO API is required — the on-page checks are done
 * locally, and the qualitative suggestions reuse the same Gemini key already
 * configured for the AI Co-Pilot (GEMINI_API_KEY in backend/.env).
 */
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { GoogleGenAI } = require('@google/genai');

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

router.use(protect);

// ---------------------------------------------------------------
// Helpers — lightweight HTML parsing (no extra dependency needed)
// ---------------------------------------------------------------
function matchOne(html, re) {
  const m = html.match(re);
  return m ? m[1].replace(/\s+/g, ' ').trim() : '';
}
function matchAll(html, re) {
  const out = [];
  let m;
  const r = new RegExp(re, 'gi');
  while ((m = r.exec(html)) !== null) out.push(m);
  return out;
}
function decodeEntities(s) {
  return String(s || '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ');
}

const STOPWORDS = new Set('a an the and or but if then else for of to in on at by with from as is are was were be been being this that these those it its it\'s we our you your they their he she his her not no do does did will would can could should may might i me my'.split(' '));

function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === 'localhost' || h === '0.0.0.0' || h.endsWith('.local')) return true;
  const ipMatch = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipMatch) {
    const [, a, b] = ipMatch.map(Number);
    if (a === 10 || a === 127 || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || a === 169) return true;
  }
  return false;
}

function analyzeHtml(html, finalUrl) {
  const title = decodeEntities(matchOne(html, /<title[^>]*>([\s\S]*?)<\/title>/i));
  const metaDescription = decodeEntities(matchOne(html, /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)
    || matchOne(html, /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i));
  const hasViewport = /<meta[^>]+name=["']viewport["']/i.test(html);
  const canonical = matchOne(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i);
  const robotsContent = matchOne(html, /<meta[^>]+name=["']robots["'][^>]*content=["']([^"']*)["']/i);
  const hasNoindex = /noindex/i.test(robotsContent);

  const h1s = matchAll(html, '<h1[^>]*>([\\s\\S]*?)<\\/h1>').map(m => decodeEntities(m[1].replace(/<[^>]+>/g, ' ').trim())).filter(Boolean);
  const headingCounts = {};
  ['h1', 'h2', 'h3', 'h4'].forEach(tag => {
    headingCounts[tag] = matchAll(html, `<${tag}[^>]*>`).length;
  });

  const imgs = matchAll(html, '<img[^>]*>');
  const imgsMissingAlt = imgs.filter(m => !/alt=["'][^"']+["']/i.test(m[0])).length;

  const ogTitle = matchOne(html, /<meta[^>]+property=["']og:title["'][^>]*content=["']([^"']*)["']/i);
  const ogDescription = matchOne(html, /<meta[^>]+property=["']og:description["'][^>]*content=["']([^"']*)["']/i);
  const ogImage = matchOne(html, /<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
  const hasStructuredData = /<script[^>]+type=["']application\/ld\+json["']/i.test(html);
  const hasHttps = /^https:/i.test(finalUrl);

  // Rough word count + keyword density from visible body text
  let bodyText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ');
  bodyText = decodeEntities(bodyText).replace(/\s+/g, ' ').trim();
  const words = bodyText.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
  const wordCount = words.length;
  const freq = {};
  words.forEach(w => { if (!STOPWORDS.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const topKeywords = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([word, count]) => ({ word, count, density: +((count / Math.max(1, wordCount)) * 100).toFixed(2) }));

  const internalLinkCount = matchAll(html, '<a[^>]+href=["\'][^"\']+["\']').length;

  // ---- Checklist with pass/fail + scoring ----
  const checklist = [];
  let score = 0;
  const add = (label, pass, weight, detail) => { checklist.push({ label, pass, detail }); if (pass) score += weight; };

  add('Title tag present', !!title, 8, title ? `"${title}"` : 'Missing — every page needs a unique <title>.');
  add('Title length is search-friendly (30–60 characters)', title.length >= 30 && title.length <= 60, 6, `${title.length} characters`);
  add('Meta description present', !!metaDescription, 8, metaDescription ? `"${metaDescription}"` : 'Missing — this is often what shows under your link in Google.');
  add('Meta description length is search-friendly (70–160 characters)', metaDescription.length >= 70 && metaDescription.length <= 160, 6, `${metaDescription.length} characters`);
  add('Exactly one H1 heading', h1s.length === 1, 8, `${h1s.length} found${h1s[0] ? `: "${h1s[0]}"` : ''}`);
  add('Uses subheadings (H2/H3) to structure content', (headingCounts.h2 || 0) + (headingCounts.h3 || 0) > 0, 5, `H2: ${headingCounts.h2 || 0}, H3: ${headingCounts.h3 || 0}`);
  add('Images have descriptive alt text', imgs.length === 0 || imgsMissingAlt === 0, 8, imgs.length ? `${imgsMissingAlt} of ${imgs.length} images missing alt text` : 'No images found');
  add('Mobile-friendly viewport tag present', hasViewport, 8, hasViewport ? 'Present' : 'Missing — this hurts mobile rankings.');
  add('Served over HTTPS', hasHttps, 8, hasHttps ? 'Secure' : 'Not secure — Google favors HTTPS sites.');
  add('Canonical URL set', !!canonical, 4, canonical || 'Missing');
  add('Not blocked from search engines', !hasNoindex, 10, hasNoindex ? 'Page has a noindex tag — it will NOT appear in Google search results!' : 'Indexable');
  add('Open Graph tags present (social share previews)', !!(ogTitle || ogDescription || ogImage), 6, (ogTitle || ogDescription || ogImage) ? 'Present' : 'Missing — links shared on social media will look plain.');
  add('Has enough content (300+ words)', wordCount >= 300, 8, `${wordCount} words`);
  add('Has structured data (Schema.org / JSON-LD)', hasStructuredData, 4, hasStructuredData ? 'Present' : 'Missing — optional but helps rich results.');
  add('Has internal links', internalLinkCount >= 3, 3, `${internalLinkCount} links found`);

  const totalWeight = 8 + 6 + 8 + 6 + 8 + 5 + 8 + 8 + 8 + 4 + 10 + 6 + 8 + 4 + 3;
  const scorePct = Math.round((score / totalWeight) * 100);

  return {
    url: finalUrl,
    title, metaDescription, canonical, hasViewport, hasHttps, hasNoindex,
    h1Count: h1s.length, h1s, headingCounts,
    images: imgs.length, imagesMissingAlt: imgsMissingAlt,
    ogTitle: !!ogTitle, ogDescription: !!ogDescription, ogImage: !!ogImage,
    hasStructuredData, wordCount, topKeywords, internalLinkCount,
    checklist, score: scorePct,
  };
}

async function fetchHtml(rawUrl) {
  let url = rawUrl.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const parsed = new URL(url);
  if (isPrivateHost(parsed.hostname)) throw new Error('That URL isn\'t reachable from here.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AzolveSEOBot/1.0; +https://azolve.io)' },
    });
    if (!res.ok) throw new Error(`Site responded with status ${res.status}`);
    const html = await res.text();
    return { html, finalUrl: res.url || url };
  } finally {
    clearTimeout(timeout);
  }
}

// ---------------------------------------------------------------
// POST /api/seo/analyze-website
// ---------------------------------------------------------------
router.post('/analyze-website', async (req, res) => {
  const { url } = req.body || {};
  if (!url || !url.trim()) return res.status(400).json({ success: false, message: 'Please provide a website URL.' });

  let html, finalUrl;
  try {
    ({ html, finalUrl } = await fetchHtml(url));
  } catch (err) {
    return res.status(200).json({
      success: false,
      message: `Couldn't fetch that site: ${err.message}. Double-check the URL and that the site is publicly reachable.`,
    });
  }

  let analysis;
  try {
    analysis = analyzeHtml(html, finalUrl);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Could not analyze that page: ' + err.message });
  }

  let aiSuggestions = null;
  let aiSummary = '';
  if (genAI) {
    try {
      const prompt = `You are an SEO consultant. Here is an automated on-page audit of a website. Based ONLY on this data, write:
1. A 2-sentence plain-English summary of overall SEO health for a non-technical business owner.
2. A prioritized list of the top 5 most impactful fixes, each as one short actionable sentence (start with the action verb), ordered by impact.
3. Three specific title/meta description rewrite suggestions if the current ones are weak or missing (skip if they're already good).

Return ONLY valid JSON, no markdown fences, in this exact shape:
{"summary": "...", "topFixes": ["...", "..."], "rewrites": [{"type":"title"|"metaDescription","suggestion":"..."}]}

AUDIT DATA:
${JSON.stringify({
  url: analysis.url, title: analysis.title, metaDescription: analysis.metaDescription,
  h1Count: analysis.h1Count, h1s: analysis.h1s, headingCounts: analysis.headingCounts,
  images: analysis.images, imagesMissingAlt: analysis.imagesMissingAlt,
  hasViewport: analysis.hasViewport, hasHttps: analysis.hasHttps, hasNoindex: analysis.hasNoindex,
  ogPresent: analysis.ogTitle || analysis.ogDescription || analysis.ogImage,
  hasStructuredData: analysis.hasStructuredData, wordCount: analysis.wordCount,
  topKeywords: analysis.topKeywords.slice(0, 6), score: analysis.score,
}, null, 0)}`;

      const response = await genAI.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
      const text = (response.text || '').trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(text);
      aiSummary = parsed.summary || '';
      aiSuggestions = { topFixes: parsed.topFixes || [], rewrites: parsed.rewrites || [] };
    } catch (err) {
      console.warn('SEO AI suggestion generation failed:', err.message);
    }
  }

  res.json({
    success: true,
    data: {
      ...analysis,
      aiSummary: aiSummary || null,
      aiSuggestions: aiSuggestions || null,
      aiAvailable: !!genAI,
    },
  });
});

// ---------------------------------------------------------------
// POST /api/seo/optimize-social
// ---------------------------------------------------------------
const PLATFORM_LIMITS = {
  instagram: { label: 'Instagram', maxChars: 2200, idealChars: [125, 300], hashtags: [5, 15] },
  facebook: { label: 'Facebook', maxChars: 63206, idealChars: [40, 120], hashtags: [1, 3] },
  twitter: { label: 'X / Twitter', maxChars: 280, idealChars: [70, 280], hashtags: [1, 2] },
  linkedin: { label: 'LinkedIn', maxChars: 3000, idealChars: [150, 300], hashtags: [3, 5] },
  youtube: { label: 'YouTube', maxChars: 5000, idealChars: [100, 300], hashtags: [3, 8] },
};

router.post('/optimize-social', async (req, res) => {
  const { platform, caption, topic } = req.body || {};
  const plat = PLATFORM_LIMITS[(platform || 'instagram').toLowerCase()] || PLATFORM_LIMITS.instagram;
  if (!caption || !caption.trim()) return res.status(400).json({ success: false, message: 'Please paste the caption/post text you want optimized.' });

  const text = caption.trim();
  const length = text.length;
  const hashtags = (text.match(/#[\w]+/g) || []);
  const hasEmoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(text);
  const hasCTA = /(click|swipe|tap|shop|buy|visit|dm|comment|follow|subscribe|sign up|learn more|book now|order now|link in bio|call now)/i.test(text);
  const hasQuestion = /\?/.test(text);
  const hasLink = /(https?:\/\/|www\.)/i.test(text);

  const checklist = [];
  const add = (label, pass, detail) => checklist.push({ label, pass, detail });
  add('Within platform character limit', length <= plat.maxChars, `${length} / ${plat.maxChars} characters`);
  add(`Length is in the ideal range for ${plat.label} (${plat.idealChars[0]}–${plat.idealChars[1]} chars)`, length >= plat.idealChars[0] && length <= plat.idealChars[1], `${length} characters`);
  add(`Hashtag count is in the recommended range (${plat.hashtags[0]}–${plat.hashtags[1]})`, hashtags.length >= plat.hashtags[0] && hashtags.length <= plat.hashtags[1], `${hashtags.length} hashtags used`);
  add('Has a clear call-to-action', hasCTA, hasCTA ? 'Found' : 'Consider adding one (e.g. "Shop now", "DM us", "Link in bio")');
  add('Uses at least one emoji (boosts engagement on most platforms)', hasEmoji, hasEmoji ? 'Found' : 'None found');
  add('No raw links pasted in caption', !hasLink || plat.label !== 'Instagram', hasLink ? 'Instagram doesn\'t make links clickable — use "link in bio" instead' : 'OK');

  const passCount = checklist.filter(c => c.pass).length;
  const score = Math.round((passCount / checklist.length) * 100);

  let aiSummary = '';
  let improvedCaption = '';
  let suggestedHashtags = [];
  let tips = [];
  if (genAI) {
    try {
      const prompt = `You are a social media growth expert. Platform: ${plat.label}. Topic/goal (may be blank): "${topic || ''}".

Original caption:
"""${text}"""

Based on ${plat.label} best practices, return ONLY valid JSON (no markdown fences) in this exact shape:
{"summary": "1-2 sentence assessment", "improvedCaption": "a rewritten, ready-to-post version of the caption, same core message, optimized for ${plat.label}", "hashtags": ["#tag1","#tag2", ...8-12 relevant hashtags without duplicating ones already in the original], "tips": ["3-4 short specific tips, each starting with an action verb"]}`;

      const response = await genAI.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
      const raw = (response.text || '').trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, '');
      const parsed = JSON.parse(raw);
      aiSummary = parsed.summary || '';
      improvedCaption = parsed.improvedCaption || '';
      suggestedHashtags = parsed.hashtags || [];
      tips = parsed.tips || [];
    } catch (err) {
      console.warn('SEO social AI suggestion generation failed:', err.message);
    }
  }

  res.json({
    success: true,
    data: {
      platform: plat.label, length, hashtagCount: hashtags.length, existingHashtags: hashtags,
      checklist, score,
      aiSummary: aiSummary || null, improvedCaption: improvedCaption || null,
      suggestedHashtags, tips, aiAvailable: !!genAI,
    },
  });
});

module.exports = router;
