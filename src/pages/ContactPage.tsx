import { Link } from "react-router-dom";

const CONTACT_NAME = "Dip Ghosh";
const CONTACT_EMAIL = "kalpadb@gmail.com";

export default function ContactPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 prose-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Contact us</h1>
      <p className="text-sm text-gray-500 mb-8">
        Questions, corrections, takedown requests, or collaboration ideas — we’d love to hear
        from you.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Email</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Reach {CONTACT_NAME} at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-violet-700 hover:underline font-medium"
          >
            {CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Spotted an error in a record?</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          You can suggest fixes directly —{" "}
          <Link to="/contribute" className="text-violet-700 hover:underline">
            become a contributor
          </Link>{" "}
          and edit works, people, and publishers, or email us the correction.
        </p>
      </section>
    </div>
  );
}
