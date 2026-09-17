# Local reading companion API

The web reader can explain a selected PDF passage through an OpenAI-compatible model server. The Node service keeps the API key outside the browser. It requires Node 20 or later and has no extra npm dependencies.

## Start

Run from the repository root:

```bash
export GRAPEPAPER_API_BASE_URL='http://localhost:11434/v1'
export GRAPEPAPER_MODEL='your-installed-model'
node server/index.mjs
```

Use your provider's HTTPS base URL, including `/v1` where required. For an authenticated provider, set `GRAPEPAPER_API_KEY` in the server environment. Do not put keys in a `VITE_*` variable, a URL, source control, exported prompts, or browser storage. The provider must support `/chat/completions` with JSON-object output. The example model name is a placeholder, not a bundled model.

The service listens only on `127.0.0.1:8787`. The reader calls `POST /api/companion` through its development proxy or the configured local API URL. `GET /api/health` returns `{ "status": "ok", "configured": false }` until a base URL and model are configured; it does not prove provider credentials are valid.

| Variable | Default | Purpose |
| --- | --- | --- |
| `GRAPEPAPER_API_BASE_URL` | unset | Provider base URL; HTTPS or loopback HTTP |
| `GRAPEPAPER_MODEL` | unset | Model ID accepted by that provider |
| `GRAPEPAPER_API_KEY` | unset | Optional server-side bearer key |
| `GRAPEPAPER_PORT` | `8787` | Local API port |
| `GRAPEPAPER_TIMEOUT_MS` | `45000` | Whole companion timeout, bounded to 1–120 seconds |
| `GRAPEPAPER_CROSSREF_ENABLED` | unset/off | Set `1` to request bibliography candidates from Crossref |
| `GRAPEPAPER_ALLOWED_ORIGINS` | localhost and 127.0.0.1 on ports 3000, 5173, 4173 | Comma-separated browser origins allowed to call this server |

No request texts, responses, keys, or reading progress are logged or stored by this service. When an external provider is configured, the selected text, supplied context, and reference excerpts are sent to that provider. With optional Crossref lookup enabled, up to three reference titles or bibliography snippets are sent to Crossref; PDF files are not uploaded by this service. Provider retention is outside this local service's control.

## Use from the public preview

The Pages preview has no model backend of its own. Start the same local service with the preview origin explicitly allowed:

```bash
export GRAPEPAPER_ALLOWED_ORIGINS='https://samzebrado.github.io'
export GRAPEPAPER_API_BASE_URL='http://localhost:11434/v1'
export GRAPEPAPER_MODEL='your-installed-model'
node server/index.mjs
```

Open **连接 AI** in the preview, enter `http://127.0.0.1:8787`, and choose **测试并连接**. This checks `/api/health` without sending article text. It verifies service configuration, not provider credentials or model quality. The address stays in memory for this page session. A browser may require local-network permission; if blocked, run the web reader locally or use prompt export / note import. For a remote HTTPS service, configure a protected gateway implementing the same endpoints and CORS policy; the bundled server remains loopback-only. The browser sends no cookies to a custom endpoint.

## Request

```json
{
  "mode": "explain",
  "selection": {
    "text": "The selected paragraph from the PDF...",
    "page": 3
  },
  "document": {
    "title": "Paper title",
    "authors": "Author A; Author B",
    "url": "https://doi.org/10.1234/example",
    "context": "Optional surrounding text actually extracted from the PDF."
  },
  "references": [
    {
      "title": "A cited paper",
      "url": "https://doi.org/10.1234/reference",
      "text": "Optional source excerpt the reader actually supplied.",
      "locator": "p. 4, Experiment 1"
    }
  ]
}
```

`selection.text` is required and limited to 12,000 characters. Page numbers are one-based. The document context is limited to 16,000 characters. There can be at most six references with at most 6,000 characters of text each. Titles/authors have a 600-character limit. The JSON body has a separate 128,000-byte limit. Top-level `text` and `page` aliases are accepted when no `selection` object is supplied. `mode` is `explain` or `story`; both return the same schema, and an empty story list is an expected result when evidence is insufficient.

## Response

```json
{
  "explanation": "中文伴读，保留关键英文术语。",
  "argumentRole": "这一段如何推进论证。",
  "citations": [
    {
      "title": "A cited paper",
      "url": "https://doi.org/10.1234/reference",
      "experiment": "根据提供的原文区分实验操纵、测量、结果和作者解释。",
      "quote": "Optional exact short excerpt",
      "locator": "p. 4, Experiment 1",
      "evidence": "provided-excerpt",
      "sourceId": "reference-1"
    }
  ],
  "stories": [
    {
      "id": "story-52d4de0ce14320f03cb5d7c1",
      "kind": "debate",
      "title": "一个相关观点分歧",
      "body": "从提供的原文展开的一小段阅读支线。",
      "sourceUrl": "https://doi.org/10.1234/reference",
      "sourceTitle": "A cited paper",
      "quote": "Optional exact short excerpt",
      "locator": "p. 4, Experiment 1",
      "sourceId": "reference-1",
      "evidence": "provided-excerpt"
    }
  ],
  "questions": ["回到原文可以核对的一个问题。"],
  "evidenceNotice": "讲解由模型生成，需对照原文……",
  "interpretationEvidence": "model-unverified",
  "metadataLookup": "disabled",
  "metadataCandidates": []
}
```

Do not render model output as HTML. Use normal text rendering, and keep the evidence notice visible. Validate links in the client as well, especially when displaying any saved/imported content. Citation links are restricted to ordinary public HTTP(S) URLs; model-supplied local or executable links are stripped.

## Evidence rules and limitations

- `provided-excerpt`: an output quotation matches a supplied excerpt after Unicode and whitespace normalization. This proves text overlap only. Interpretation, authorship, excerpt provenance, and the model's experiment description still require checking.
- `metadata-only`: Crossref returned bibliographic metadata for a search candidate. The result may be the wrong paper. No experiment, quotation, date-sensitive news, or biography is verified by this match.
- `model-unverified`: no supporting excerpt was matched. The UI must not relabel it as verified.

The model cannot promote its own evidence status. Quotes that do not match a supplied source or exceed 25 English words / 100 Chinese characters are removed. Citation experiments are replaced with an explicit "cannot verify without the source text" message if the source has no excerpt. Locators come from supplied source information, never a model-invented page number.

Stories require a source excerpt and an exact supporting quote. A news card additionally requires a date in that source excerpt. Metadata alone cannot produce a story. Unsupported story cards are removed, so `stories: []` is normal. These checks cannot establish whether an interpretation is true; every model interpretation stays `model-unverified`. Private gossip and speculative personal claims are excluded from the prompt. A story is a reading invitation, not an asserted fact check.

Story IDs are deterministic hashes of the displayed source URL, kind, title, and body. The reader can avoid repeating the same card while allowing different cards from the same source; array position and temporary source slot do not affect identity.

The service does not fetch publisher full texts, authenticate into institutional libraries, run a live news search, or inspect Zotero's database. Supply the actual reference excerpt to get source-grounded experimental detail. Crossref's [REST API documentation](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) describes its bibliographic metadata; its [full-text guidance](https://www.crossref.org/documentation/retrieve-metadata/text-and-data-mining/) explicitly distinguishes metadata from externally hosted full text.

## Errors and cancellation

Failures return JSON of the form:

```json
{"error":{"code":"PROVIDER_NOT_CONFIGURED","message":"尚未配置伴读模型。请在本地服务设置模型，或导出伴读提示词。"}}
```

| HTTP status | Code examples | Reader behavior |
| --- | --- | --- |
| 400 / 422 | `INVALID_JSON`, `INVALID_INPUT` | Explain how to shorten/correct the selection |
| 403 | `ORIGIN_NOT_ALLOWED`, `HOST_NOT_ALLOWED` | Check the local reader origin and service URL |
| 413 | `REQUEST_TOO_LARGE` | Send a smaller excerpt |
| 429 | `PROVIDER_RATE_LIMITED` | Let the reader retry later |
| 503 | `PROVIDER_NOT_CONFIGURED`, `SERVER_BUSY` | Offer setup/prompt export or retry |
| 502 | `PROVIDER_ERROR`, `PROVIDER_UNAVAILABLE`, `INVALID_PROVIDER_RESPONSE` | Show a recoverable error; keep the selection |
| 504 | `PROVIDER_TIMEOUT` | Offer retry with a shorter excerpt |

Upstream response bodies and exceptions are not echoed to the client. Closing/cancelling the HTTP request aborts provider work where the provider respects cancellation. The server accepts at most two concurrent companion requests. It never turns an explanation or a model response into an "already read" action: confirmation and optional progress persistence belong to the reader.

## Verification

```bash
node --test server/companion.test.mjs
```

Tests exercise actual local HTTP requests, offline errors, provider request shape, response validation, source boundaries, Crossref candidate handling, concurrency, cancellation, and secret-safe failures using mocked provider responses. They do not claim a successful live provider inference.

Next: add user-directed retrieval of accessible reference full texts, with per-source provenance and explicit consent before sending retrieved text to a model.
