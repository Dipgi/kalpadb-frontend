import { useState } from "react";
import { Link } from "react-router-dom";

// Zenodo concept DOI for the dataset (resolves to the latest published version).
// Version-specific DOIs (e.g. v1.0 = 10.5281/zenodo.20735544) live on each Zenodo record.
const ZENODO_DOI: string | null = "10.5281/zenodo.20735543";

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function CitationBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — user can select manually */
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-500">{label}</span>
        <button
          onClick={copy}
          className="text-xs text-violet-700 hover:underline"
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 whitespace-pre-wrap break-words font-mono">
        {text}
      </pre>
    </div>
  );
}

export default function CitePage() {
  const accessed = today();
  const doiLine = ZENODO_DOI ? ` https://doi.org/${ZENODO_DOI}.` : "";

  const apa = `Ghosh, D. (2026). KalpaDB: Indian Speculative Fiction Database. https://kalpadb.com${doiLine} (accessed ${accessed})`;
  const plain = `Ghosh, Dip. KalpaDB: Indian Speculative Fiction Database. 2026. https://kalpadb.com${doiLine} (accessed ${accessed}).`;
  const bibtex = `@misc{kalpadb,
  author       = {Ghosh, Dip},
  title        = {KalpaDB: Indian Speculative Fiction Database},
  year         = {2026},
  url          = {https://kalpadb.com},${ZENODO_DOI ? `\n  doi          = {${ZENODO_DOI}},` : ""}
  note         = {Accessed ${accessed}}
}`;

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">How to cite KalpaDB</h1>
      <p className="text-sm text-gray-500 mb-8">
        If KalpaDB is useful in your research, writing, or project, please cite it. The data is
        available for reuse under{" "}
        <Link to="/license" className="text-violet-700 hover:underline">CC&nbsp;BY-SA&nbsp;4.0</Link>{" "}
        — attribution is part of the license.
      </p>

      {ZENODO_DOI && (
        <p className="text-sm text-gray-600 mb-6">
          Permanent archive (DOI):{" "}
          <a
            href={`https://doi.org/${ZENODO_DOI}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 hover:underline font-mono"
          >
            {ZENODO_DOI}
          </a>
        </p>
      )}

      <CitationBlock label="Plain text" text={plain} />
      <CitationBlock label="APA" text={apa} />
      <CitationBlock label="BibTeX" text={bibtex} />

      {!ZENODO_DOI && (
        <p className="text-xs text-gray-400 mt-2">
          A permanent DOI for citable, versioned snapshots is coming soon via Zenodo — this page
          will include it automatically once published.
        </p>
      )}
    </div>
  );
}
