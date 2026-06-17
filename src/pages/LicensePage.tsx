import { Link } from "react-router-dom";

export default function LicensePage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 prose-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">License &amp; Reuse</h1>
      <p className="text-sm text-gray-500 mb-8">
        KalpaDB is an open database. You are welcome to reuse it — please credit us and keep
        derivatives open. See <Link to="/cite" className="text-violet-700 hover:underline">how to cite</Link>.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">The data</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          The KalpaDB database — the selection, arrangement, and curation of records about Indian
          speculative fiction — is licensed under the{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 hover:underline"
          >
            Creative Commons Attribution-ShareAlike 4.0 International (CC&nbsp;BY-SA&nbsp;4.0)
          </a>{" "}
          license. In short, you are free to share and adapt the data, for any purpose, including
          commercially, provided that you:
        </p>
        <ul className="list-disc pl-5 mt-3 space-y-1 text-sm text-gray-600">
          <li>
            <strong>Attribute</strong> — credit “KalpaDB” and its creator (Dip Ghosh), link back to{" "}
            <a href="https://kalpadb.com" className="text-violet-700 hover:underline">kalpadb.com</a>,
            and indicate if changes were made.
          </li>
          <li>
            <strong>ShareAlike</strong> — if you remix or build upon the data, distribute your
            contributions under the same CC&nbsp;BY-SA&nbsp;4.0 license.
          </li>
        </ul>
        <p className="text-xs text-gray-400 mt-3">
          Individual facts (a title, a publication year) are not themselves owned by anyone; the
          license covers the database as a curated compilation and the database rights that apply to
          it.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">The software</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          The KalpaDB source code (the website and API that power this database) is licensed
          separately under the{" "}
          <a
            href="https://www.gnu.org/licenses/agpl-3.0.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 hover:underline"
          >
            GNU Affero General Public License v3.0 (AGPL-3.0)
          </a>
          . If you run a modified version of the software as a network service, you must make your
          modified source available to its users under the same license.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Contributor agreement</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          By contributing to KalpaDB you agree that your contribution may be published under
          CC&nbsp;BY-SA&nbsp;4.0, and that KalpaDB may use, adapt, and relicense it as part of the
          database. You confirm that you have the right to submit the contribution and that it does
          not infringe anyone else’s rights. This keeps the entire database cleanly and openly
          licensed for everyone.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Permanent archive &amp; citation</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Versioned snapshots of the database are archived on Zenodo with a permanent DOI:{" "}
          <a
            href="https://doi.org/10.5281/zenodo.20735543"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 hover:underline font-mono"
          >
            10.5281/zenodo.20735543
          </a>
          . See <Link to="/cite" className="text-violet-700 hover:underline">how to cite</Link> for
          ready-to-copy citation formats.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Name &amp; trademark</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          “KalpaDB” and the KalpaDB logo are trademarks of Dip Ghosh. The open licenses above apply
          to the data and the code — they do not grant any right to use the KalpaDB name or logo in
          a way that suggests endorsement or affiliation.
        </p>
      </section>

      <p className="text-xs text-gray-400">
        This page is a plain-language summary, not legal advice. The full terms are in the linked
        license texts.
      </p>
    </div>
  );
}
