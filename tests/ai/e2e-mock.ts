/** Standalone mock providers for the end-to-end test (port from MOCK_PORT). Gemini answers 429 to the first request. */
import { startMock } from "./mockProviders";
import http from "node:http";

const advice = {
  summary: "test summary",
  lookFor: ["vanilla"],
  picks: [{ title: "Vanilla direction", kind: "type", why: "because", how: "" }],
  avoid: [],
  general: ["tip"],
  testing: ["test on skin"],
};

async function main() {
const m = await startMock();
m.setAnswer((p) => ({ ...advice, summary: `served by ${p}` }));
m.script("gemini", [{ status: 429, body: { error: { code: 429, message: "Resource exhausted: requests per minute", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "45s" }] } } }]);
// forward a fixed port to the mock's random port
const port = Number(process.env.MOCK_PORT || 4010);
const target = new URL(m.url);
http
  .createServer((req, res) => {
    const up = http.request({ host: target.hostname, port: target.port, path: req.url, method: req.method, headers: req.headers }, (r) => {
      res.writeHead(r.statusCode ?? 500, r.headers);
      r.pipe(res);
    });
    req.pipe(up);
  })
  .listen(port, () => console.log(`mock on ${port}`));
setInterval(() => {}, 1 << 30);
}
main();
