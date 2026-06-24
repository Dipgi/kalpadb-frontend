import { Link } from "react-router-dom";

// Current volunteer nicknames. Curated credits — update when the volunteer
// roster changes (the project's own `kalpadb` account is intentionally omitted).
const VOLUNTEERS = [
  "Sarban",
  "SubhasreeMitra",
  "TheBibliophileBong",
  "anushtup",
  "debdos",
  "pratikbasu_",
  "sengupta_pradip",
];

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 prose-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">About KalpaDB</h1>
      <p className="text-sm text-gray-500 mb-8">
        A community-built catalogue of Bengali and Indian science fiction, fantasy, and
        speculative fiction.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">What we do</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          KalpaDB documents the people, publishers, and works behind Bengali speculative
          fiction — books, anthologies, magazines, and the writers, translators, and artists who
          make them. Our goal is a reliable, openly licensed reference for readers, researchers,
          and fans. The dataset is released under{" "}
          <a
            href="https://creativecommons.org/licenses/by-sa/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-violet-700 hover:underline"
          >
            CC BY-SA 4.0
          </a>{" "}
          — see <Link to="/license" className="text-violet-700 hover:underline">License &amp; Reuse</Link>{" "}
          and <Link to="/cite" className="text-violet-700 hover:underline">how to cite</Link>.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Our volunteers</h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-3">
          KalpaDB is maintained by a small group of volunteers who add, verify, and correct
          records. With thanks to:
        </p>
        <ul className="flex flex-wrap gap-2 list-none p-0">
          {VOLUNTEERS.map((name) => (
            <li
              key={name}
              className="bg-violet-50 text-violet-700 text-sm px-3 py-1 rounded-full"
            >
              {name}
            </li>
          ))}
        </ul>
        <p className="text-sm text-gray-600 leading-relaxed mt-4">
          Want to help?{" "}
          <Link to="/contribute" className="text-violet-700 hover:underline">
            Become a contributor
          </Link>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Get in touch</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Questions, corrections, or partnership ideas? Visit{" "}
          <Link to="/contact" className="text-violet-700 hover:underline">Contact us</Link>.
        </p>
      </section>
    </div>
  );
}
