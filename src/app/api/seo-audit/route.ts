import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";

export const maxDuration = 30;

interface SeoCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  value: string;
  points: number;
  maxPoints: number;
}

interface SeoCategory {
  name: string;
  icon: string;
  checks: SeoCheck[];
  score: number;
  maxScore: number;
}

interface SeoAuditResult {
  url: string;
  fetchedAt: string;
  responseTime: number;
  statusCode: number;
  categories: SeoCategory[];
  totalScore: number;
  maxScore: number;
  percentage: number;
}

function checkTitle($: cheerio.CheerioAPI): SeoCheck[] {
  const title = $("title").first().text().trim();
  const checks: SeoCheck[] = [];

  if (title) {
    checks.push({
      name: "Balise <title> presente",
      status: "pass",
      value: title,
      points: 5,
      maxPoints: 5,
    });

    const len = title.length;
    if (len >= 30 && len <= 65) {
      checks.push({
        name: "Longueur du title (30-65 car.)",
        status: "pass",
        value: `${len} caracteres`,
        points: 5,
        maxPoints: 5,
      });
    } else if (len > 0) {
      checks.push({
        name: "Longueur du title (30-65 car.)",
        status: len < 30 ? "warn" : "warn",
        value: `${len} caracteres (${len < 30 ? "trop court" : "trop long"})`,
        points: 2,
        maxPoints: 5,
      });
    }
  } else {
    checks.push({
      name: "Balise <title> presente",
      status: "fail",
      value: "Absente",
      points: 0,
      maxPoints: 5,
    });
    checks.push({
      name: "Longueur du title (30-65 car.)",
      status: "fail",
      value: "N/A",
      points: 0,
      maxPoints: 5,
    });
  }

  return checks;
}

function checkMetaDescription($: cheerio.CheerioAPI): SeoCheck[] {
  const desc =
    $('meta[name="description"]').attr("content")?.trim() || "";
  const checks: SeoCheck[] = [];

  if (desc) {
    checks.push({
      name: "Meta description presente",
      status: "pass",
      value: desc.length > 80 ? desc.substring(0, 80) + "..." : desc,
      points: 5,
      maxPoints: 5,
    });

    const len = desc.length;
    if (len >= 120 && len <= 160) {
      checks.push({
        name: "Longueur description (120-160)",
        status: "pass",
        value: `${len} caracteres`,
        points: 5,
        maxPoints: 5,
      });
    } else {
      checks.push({
        name: "Longueur description (120-160)",
        status: "warn",
        value: `${len} caracteres (${len < 120 ? "trop court" : "trop long"})`,
        points: 2,
        maxPoints: 5,
      });
    }
  } else {
    checks.push({
      name: "Meta description presente",
      status: "fail",
      value: "Absente",
      points: 0,
      maxPoints: 5,
    });
    checks.push({
      name: "Longueur description (120-160)",
      status: "fail",
      value: "N/A",
      points: 0,
      maxPoints: 5,
    });
  }

  return checks;
}

function checkMetaTags($: cheerio.CheerioAPI, url: string): SeoCategory {
  const checks: SeoCheck[] = [];

  checks.push(...checkTitle($));
  checks.push(...checkMetaDescription($));

  // Viewport
  const viewport = $('meta[name="viewport"]').attr("content");
  checks.push({
    name: "Meta viewport (mobile)",
    status: viewport ? "pass" : "fail",
    value: viewport || "Absente",
    points: viewport ? 3 : 0,
    maxPoints: 3,
  });

  // Charset
  const charset =
    $('meta[charset]').length > 0 ||
    $('meta[http-equiv="Content-Type"]').length > 0;
  checks.push({
    name: "Declaration charset",
    status: charset ? "pass" : "fail",
    value: charset ? "UTF-8" : "Absente",
    points: charset ? 2 : 0,
    maxPoints: 2,
  });

  // Lang
  const lang = $("html").attr("lang");
  checks.push({
    name: "Attribut lang sur <html>",
    status: lang ? "pass" : "fail",
    value: lang || "Absent",
    points: lang ? 3 : 0,
    maxPoints: 3,
  });

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href");
  checks.push({
    name: "URL canonique",
    status: canonical ? "pass" : "fail",
    value: canonical || "Absente",
    points: canonical ? 2 : 0,
    maxPoints: 2,
  });

  const score = checks.reduce((s, c) => s + c.points, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxPoints, 0);

  return { name: "Meta Tags", icon: "tag", checks, score, maxScore };
}

function checkHeadings($: cheerio.CheerioAPI): SeoCategory {
  const h1s = $("h1");
  const h2s = $("h2");
  const h3s = $("h3");
  const checks: SeoCheck[] = [];

  // H1 exists
  checks.push({
    name: "Balise H1 presente",
    status: h1s.length > 0 ? "pass" : "fail",
    value: h1s.length > 0 ? h1s.first().text().trim().substring(0, 60) : "Absente",
    points: h1s.length > 0 ? 5 : 0,
    maxPoints: 5,
  });

  // Single H1
  if (h1s.length > 0) {
    checks.push({
      name: "H1 unique (1 seul)",
      status: h1s.length === 1 ? "pass" : "warn",
      value: `${h1s.length} H1 trouvee(s)`,
      points: h1s.length === 1 ? 4 : 1,
      maxPoints: 4,
    });
  } else {
    checks.push({
      name: "H1 unique (1 seul)",
      status: "fail",
      value: "Aucun H1",
      points: 0,
      maxPoints: 4,
    });
  }

  // H2s exist
  checks.push({
    name: "Balises H2 presentes",
    status: h2s.length > 0 ? "pass" : "warn",
    value: `${h2s.length} H2 trouvee(s)`,
    points: h2s.length > 0 ? 4 : 0,
    maxPoints: 4,
  });

  // H3s for depth
  checks.push({
    name: "Profondeur de structure (H3)",
    status: h3s.length > 0 ? "pass" : "warn",
    value: `${h3s.length} H3 trouvee(s)`,
    points: h3s.length > 0 ? 2 : 0,
    maxPoints: 2,
  });

  const score = checks.reduce((s, c) => s + c.points, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxPoints, 0);

  return { name: "Structure Titres", icon: "heading", checks, score, maxScore };
}

function checkOpenGraph($: cheerio.CheerioAPI): SeoCategory {
  const checks: SeoCheck[] = [];

  const ogTags = [
    { prop: "og:title", name: "og:title", pts: 4 },
    { prop: "og:description", name: "og:description", pts: 4 },
    { prop: "og:image", name: "og:image", pts: 4 },
    { prop: "og:type", name: "og:type", pts: 2 },
    { prop: "og:url", name: "og:url", pts: 2 },
    { prop: "og:locale", name: "og:locale", pts: 2 },
  ];

  for (const tag of ogTags) {
    const val =
      $(`meta[property="${tag.prop}"]`).attr("content") ||
      $(`meta[name="${tag.prop}"]`).attr("content");
    checks.push({
      name: tag.name,
      status: val ? "pass" : "fail",
      value: val
        ? val.length > 60
          ? val.substring(0, 60) + "..."
          : val
        : "Absent",
      points: val ? tag.pts : 0,
      maxPoints: tag.pts,
    });
  }

  // Twitter Card
  const twitterCard =
    $('meta[name="twitter:card"]').attr("content") ||
    $('meta[property="twitter:card"]').attr("content");
  checks.push({
    name: "Twitter Card",
    status: twitterCard ? "pass" : "fail",
    value: twitterCard || "Absente",
    points: twitterCard ? 3 : 0,
    maxPoints: 3,
  });

  const score = checks.reduce((s, c) => s + c.points, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxPoints, 0);

  return { name: "Reseaux Sociaux", icon: "share", checks, score, maxScore };
}

function checkStructuredData($: cheerio.CheerioAPI): SeoCategory {
  const checks: SeoCheck[] = [];
  const jsonLdScripts = $('script[type="application/ld+json"]');
  const schemas: string[] = [];

  jsonLdScripts.each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      if (data["@type"]) schemas.push(data["@type"]);
      if (Array.isArray(data["@graph"])) {
        data["@graph"].forEach((item: Record<string, string>) => {
          if (item["@type"]) schemas.push(item["@type"]);
        });
      }
    } catch {
      // invalid JSON-LD
    }
  });

  // JSON-LD present
  checks.push({
    name: "JSON-LD present",
    status: jsonLdScripts.length > 0 ? "pass" : "fail",
    value:
      jsonLdScripts.length > 0
        ? `${jsonLdScripts.length} bloc(s) trouve(s)`
        : "Absent",
    points: jsonLdScripts.length > 0 ? 6 : 0,
    maxPoints: 6,
  });

  // Schema types
  checks.push({
    name: "Types Schema.org definis",
    status: schemas.length > 0 ? "pass" : "fail",
    value: schemas.length > 0 ? schemas.join(", ") : "Aucun",
    points: schemas.length > 0 ? 5 : 0,
    maxPoints: 5,
  });

  // Rich schemas (Restaurant, LocalBusiness, Product, etc.)
  const richTypes = [
    "Restaurant",
    "LocalBusiness",
    "Product",
    "Menu",
    "FAQPage",
    "BreadcrumbList",
    "Organization",
  ];
  const hasRich = schemas.some((s) => richTypes.includes(s));
  checks.push({
    name: "Schema riche (Restaurant, Menu...)",
    status: hasRich ? "pass" : "fail",
    value: hasRich
      ? schemas.filter((s) => richTypes.includes(s)).join(", ")
      : "Aucun schema riche",
    points: hasRich ? 5 : 0,
    maxPoints: 5,
  });

  // Multiple schemas
  checks.push({
    name: "Schemas multiples",
    status: schemas.length >= 2 ? "pass" : schemas.length === 1 ? "warn" : "fail",
    value: `${schemas.length} type(s)`,
    points: schemas.length >= 2 ? 4 : schemas.length === 1 ? 2 : 0,
    maxPoints: 4,
  });

  const score = checks.reduce((s, c) => s + c.points, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxPoints, 0);

  return { name: "Donnees Structurees", icon: "code", checks, score, maxScore };
}

function checkImages($: cheerio.CheerioAPI): SeoCategory {
  const images = $("img");
  const total = images.length;
  let withAlt = 0;
  let withEmptyAlt = 0;

  images.each((_, el) => {
    const alt = $(el).attr("alt");
    if (alt && alt.trim().length > 0) withAlt++;
    else if (alt === "") withEmptyAlt++;
  });

  const checks: SeoCheck[] = [];

  checks.push({
    name: "Images trouvees",
    status: total > 0 ? "pass" : "warn",
    value: `${total} image(s)`,
    points: 0,
    maxPoints: 0,
  });

  if (total > 0) {
    const altRatio = withAlt / total;
    checks.push({
      name: "Images avec attribut alt",
      status: altRatio >= 0.9 ? "pass" : altRatio >= 0.5 ? "warn" : "fail",
      value: `${withAlt}/${total} (${Math.round(altRatio * 100)}%)`,
      points: Math.round(altRatio * 8),
      maxPoints: 8,
    });

    checks.push({
      name: "Images avec alt vide",
      status: withEmptyAlt === 0 ? "pass" : "warn",
      value: `${withEmptyAlt} image(s) avec alt vide`,
      points: withEmptyAlt === 0 ? 2 : 1,
      maxPoints: 2,
    });
  } else {
    checks.push({
      name: "Images avec attribut alt",
      status: "warn",
      value: "Aucune image a analyser",
      points: 5,
      maxPoints: 8,
    });
    checks.push({
      name: "Images avec alt vide",
      status: "pass",
      value: "N/A",
      points: 2,
      maxPoints: 2,
    });
  }

  // Lazy loading
  const lazyImages = $('img[loading="lazy"]').length;
  checks.push({
    name: "Lazy loading des images",
    status:
      total === 0
        ? "pass"
        : lazyImages > 0
          ? "pass"
          : "fail",
    value:
      total === 0
        ? "N/A"
        : `${lazyImages}/${total} image(s)`,
    points: total === 0 || lazyImages > 0 ? 3 : 0,
    maxPoints: 3,
  });

  const score = checks.reduce((s, c) => s + c.points, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxPoints, 0);

  return { name: "Images", icon: "image", checks, score, maxScore };
}

function checkTechnical(
  $: cheerio.CheerioAPI,
  url: string,
  responseTime: number,
  statusCode: number,
  robotsOk: boolean,
  sitemapOk: boolean,
  htmlSize: number
): SeoCategory {
  const checks: SeoCheck[] = [];

  // HTTPS
  const isHttps = url.startsWith("https://");
  checks.push({
    name: "HTTPS actif",
    status: isHttps ? "pass" : "fail",
    value: isHttps ? "Oui" : "Non - HTTP non securise",
    points: isHttps ? 4 : 0,
    maxPoints: 4,
  });

  // Response time
  checks.push({
    name: "Temps de reponse serveur",
    status: responseTime < 1000 ? "pass" : responseTime < 3000 ? "warn" : "fail",
    value: `${responseTime}ms`,
    points: responseTime < 1000 ? 3 : responseTime < 3000 ? 1 : 0,
    maxPoints: 3,
  });

  // Status code
  checks.push({
    name: "Code HTTP",
    status: statusCode === 200 ? "pass" : "fail",
    value: `${statusCode}`,
    points: statusCode === 200 ? 2 : 0,
    maxPoints: 2,
  });

  // robots.txt
  checks.push({
    name: "robots.txt accessible",
    status: robotsOk ? "pass" : "fail",
    value: robotsOk ? "Accessible" : "Non trouve",
    points: robotsOk ? 3 : 0,
    maxPoints: 3,
  });

  // sitemap.xml
  checks.push({
    name: "sitemap.xml accessible",
    status: sitemapOk ? "pass" : "fail",
    value: sitemapOk ? "Accessible" : "Non trouve",
    points: sitemapOk ? 3 : 0,
    maxPoints: 3,
  });

  // Favicon
  const favicon =
    $('link[rel="icon"]').length > 0 ||
    $('link[rel="shortcut icon"]').length > 0;
  checks.push({
    name: "Favicon present",
    status: favicon ? "pass" : "fail",
    value: favicon ? "Oui" : "Non",
    points: favicon ? 2 : 0,
    maxPoints: 2,
  });

  // Page size
  const sizeKb = Math.round(htmlSize / 1024);
  checks.push({
    name: "Taille HTML",
    status: sizeKb < 100 ? "pass" : sizeKb < 300 ? "warn" : "fail",
    value: `${sizeKb} Ko`,
    points: sizeKb < 100 ? 3 : sizeKb < 300 ? 1 : 0,
    maxPoints: 3,
  });

  const score = checks.reduce((s, c) => s + c.points, 0);
  const maxScore = checks.reduce((s, c) => s + c.maxPoints, 0);

  return { name: "Technique", icon: "settings", checks, score, maxScore };
}

async function checkUrlExists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "SEO-Audit-Bot/1.0" },
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function auditUrl(url: string): Promise<SeoAuditResult> {
  // Normalize URL
  if (!url.startsWith("http")) url = "https://" + url;
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}`;

  const startTime = Date.now();
  let html = "";
  let statusCode = 0;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8",
      },
    });
    statusCode = res.status;
    html = await res.text();
  } catch {
    return {
      url,
      fetchedAt: new Date().toISOString(),
      responseTime: Date.now() - startTime,
      statusCode: 0,
      categories: [],
      totalScore: 0,
      maxScore: 100,
      percentage: 0,
    };
  }

  const responseTime = Date.now() - startTime;
  const $ = cheerio.load(html);

  // Check robots.txt and sitemap in parallel
  const [robotsOk, sitemapOk] = await Promise.all([
    checkUrlExists(`${baseUrl}/robots.txt`),
    checkUrlExists(`${baseUrl}/sitemap.xml`),
  ]);

  const categories: SeoCategory[] = [
    checkMetaTags($, url),
    checkHeadings($),
    checkOpenGraph($),
    checkStructuredData($),
    checkImages($),
    checkTechnical($, url, responseTime, statusCode, robotsOk, sitemapOk, html.length),
  ];

  const totalScore = categories.reduce((s, c) => s + c.score, 0);
  const maxScore = categories.reduce((s, c) => s + c.maxScore, 0);

  return {
    url,
    fetchedAt: new Date().toISOString(),
    responseTime,
    statusCode,
    categories,
    totalScore,
    maxScore,
    percentage: Math.round((totalScore / maxScore) * 100),
  };
}

export async function POST(req: NextRequest) {
  try {
    const { urls } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { error: "Fournissez un tableau d'URLs" },
        { status: 400 }
      );
    }

    const results = await Promise.all(urls.map((u: string) => auditUrl(u)));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      { error: "Erreur lors de l'analyse: " + (error as Error).message },
      { status: 500 }
    );
  }
}
