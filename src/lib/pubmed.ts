// PubMed E-utilities로 문헌을 검색한다. API 키 없이 쓰며 호출 빈도는 낮다.
export type PubmedRef = { pmid: string; title: string; journal: string; year: string; abstract: string; url: string };

const BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

async function fetchWithTimeout(url: string, ms = 9000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal, headers: { "User-Agent": "hsct-care-prototype" } });
  } finally {
    clearTimeout(t);
  }
}

function strip(xml: string) {
  return xml
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

async function esearch(term: string, max: number): Promise<string[]> {
  const es = await fetchWithTimeout(`${BASE}/esearch.fcgi?db=pubmed&retmode=json&retmax=${max}&sort=relevance&term=${encodeURIComponent(term)}`);
  const esj = (await es.json()) as { esearchresult?: { idlist?: string[] } };
  return esj.esearchresult?.idlist ?? [];
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// 검색어가 너무 구체적이면 결과가 없으므로 단계적으로 넓힌다.
export async function searchPubmed(query: string, max = 4): Promise<PubmedRef[]> {
  if (!query.trim()) return [];
  try {
    const words = query.replace(/[^A-Za-z0-9\s-]/g, " ").split(/\s+/).filter(Boolean);
    const candidates = [
      `${query} AND (hematopoietic stem cell transplantation OR allogeneic transplant)`,
      query,
      `${words.slice(0, 3).join(" ")} hematopoietic stem cell transplantation`,
      `${words.slice(0, 2).join(" ")} immunocompromised`,
    ];
    let ids: string[] = [];
    for (const term of candidates) {
      ids = await esearch(term, max);
      if (ids.length > 0) break;
      await sleep(350);
    }
    if (ids.length === 0) return [];
    await sleep(350);
    const ef = await fetchWithTimeout(`${BASE}/efetch.fcgi?db=pubmed&retmode=xml&rettype=abstract&id=${ids.join(",")}`);
    const xml = await ef.text();
    const articles = xml.split("<PubmedArticle>").slice(1);
    return articles.map((a) => {
      const pmid = (a.match(/<PMID[^>]*>(\d+)<\/PMID>/) ?? [])[1] ?? "";
      const title = strip((a.match(/<ArticleTitle>([\s\S]*?)<\/ArticleTitle>/) ?? [])[1] ?? "");
      const journal = strip((a.match(/<Journal>[\s\S]*?<Title>([\s\S]*?)<\/Title>/) ?? [])[1] ?? "");
      const year = (a.match(/<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>/) ?? [])[1] ?? (a.match(/<MedlineDate>(\d{4})/) ?? [])[1] ?? "";
      const abs = [...a.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => strip(m[1])).join(" ");
      return { pmid, title, journal, year, abstract: abs.slice(0, 1800), url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` };
    });
  } catch {
    return [];
  }
}
