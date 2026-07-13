import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const projectRoot = new URL("../", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the finished homepage and complete data status", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>114 申請入學一階落點查詢/);
  assert.match(html, /每一關都算清楚/);
  assert.match(html, />66<\/strong><span>所學校來源索引/);
  assert.match(html, />2168<\/strong><span>筆官方校系資料/);
  assert.match(html, /href="\/how-it-works"/);
  assert.match(html, /href="\/query"/);
  assert.match(html, /官方總表/);
  assert.doesNotMatch(html, /codex-preview|Codex is working|react-loading-skeleton/);
});

test("server-renders every requested site page", async () => {
  const cases = [
    ["/how-it-works", /HOW IT WORKS|網站怎麼判斷/],
    ["/query", /輸入成績與篩選校系/],
    ["/results", /一階篩選回測結果/],
  ];

  for (const [pathname, expected] of cases) {
    const response = await render(pathname);
    assert.equal(response.status, 200, pathname);
    assert.match(await response.text(), expected, pathname);
  }
});

test("keeps the homepage header static and removes starter preview files", async () => {
  const [css, page, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(
    css,
    /\.home-header,\s*\n\.subpage-header\s*\{[^}]*position:\s*static/s,
  );
  assert.match(page, /route="how-it-works"/);
  assert.match(page, /route="query"/);
  assert.match(layout, /title:\s*"114 申請入學一階落點查詢/);
  assert.match(layout, /images:\s*\[\{ url: "\/og\.png"/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("app/_sites-preview", projectRoot)));
});
