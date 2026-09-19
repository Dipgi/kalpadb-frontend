import { Link } from "react-router-dom";
import { useSeo } from "../hooks/useSeo";

const CONTACT_EMAIL = "kalpadb@gmail.com";
const LAST_UPDATED = "19 September 2026";

export default function PrivacyPage() {
  useSeo({
    title: "Privacy Policy",
    description:
      "What KalpaDB collects about accounts, how catalogue data is sourced, and how to request corrections or removal.",
    path: "/privacy",
  });
  return (
    <div className="max-w-2xl mx-auto px-4 py-10 prose-sm">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">
        Last updated {LAST_UPDATED}. This covers two different things: the account data we hold
        about <em>you</em> if you sign up, and the catalogue data volunteers contribute about
        writers, artists, and other people connected to published Indian speculative fiction.
        They're handled very differently — see below.
      </p>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Account data</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          If you create an account, we store your username, email address, a securely hashed
          password (we never see or store it in plain text), and anything you choose to add to
          your profile — display name, bio, and a picture. Your{" "}
          <strong>email address is never shown publicly</strong>; your username, bio, picture,
          and contribution stats are shown on your public profile page if you set them.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          We also keep a record of what you submit — new records and edits are tied to your
          account, and a rejected or corrected submission keeps that history. This is how the
          review queue, the duplicate scanner, and abuse prevention work; it's also what lets us
          credit volunteers accurately and investigate bad-faith edits.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Messages to admins</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          If you message the admin team through the site, that message (and our replies) are
          stored indefinitely and visible to the whole admin team, not just one person. Don't
          send anything in a message you wouldn't want more than one admin to read.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Cookies &amp; local storage</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          We don't use tracking or advertising cookies. Your login session is kept in your
          browser's local storage, not a cookie. We count anonymous page visits (a single
          site-wide counter, once per browser session) to gauge traffic — this isn't tied to your
          account or IP address.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Shared with third parties</h2>
        <p className="text-sm text-gray-600 leading-relaxed">A few services process data on our behalf:</p>
        <ul className="list-disc pl-5 mt-2 space-y-1.5 text-sm text-gray-600">
          <li>
            <strong>Cloudflare Turnstile</strong> — a bot-check on registration and login. It sees
            your IP address and a verification token; it doesn't get your email or password.
          </li>
          <li>
            <strong>Resend</strong> — sends our transactional emails (verification, password
            reset, submission notices), so your email address passes through their systems to
            reach your inbox.
          </li>
          <li>
            <strong>Cloudflare R2</strong> — hosts uploaded images (avatars, cover images), stored
            as static files, not linked to any tracking.
          </li>
        </ul>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          We don't sell data, and we don't share it with anyone else beyond what's needed to run
          the site.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          About the catalogue: accuracy &amp; who it's about
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          The catalogue itself — books, people, publishers, and everything else you browse — is
          built by volunteer contributors and reviewed by a small admin team. We do our best to
          keep it accurate, but{" "}
          <strong>it is not guaranteed to be complete, correct, or up to date</strong>. If you're
          relying on a fact from KalpaDB for something that matters, verify it against a primary
          source first.
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          Person records exist to document someone's <strong>public, bibliographic</strong> connection
          to Indian speculative fiction — the works they wrote, edited, illustrated, or otherwise
          made; their public biography, nationality, and awards. KalpaDB is{" "}
          <strong>not meant to hold private personal information</strong> — a home address, phone
          number, personal email, health information, or similar — about anyone, whether they use
          the site or are simply catalogued in it. Contributors shouldn't add this kind of
          information, and if it ends up in a record anyway — by mistake, or because a contributor
          added something they shouldn't have — we treat it as a priority to remove.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Corrections &amp; removal requests
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Anyone can flag a problem with a record — a factual error, a reference that's out of
          date, or content that shouldn't be there at all. This applies whether you're the person
          a record is about, someone acting on their behalf, or just a reader who spotted a
          mistake.
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1.5 text-sm text-gray-600">
          <li>
            <strong>Private or sensitive personal information</strong> (an address, phone number,
            health or financial detail, or similar) reported to us in a record is removed as soon
            as an admin sees the request — we don't require proof of identity to pull down
            something that clearly shouldn't be public.
          </li>
          <li>
            <strong>Factual errors, disputed claims, or anything else</strong> — we'll review it
            against available sources and correct or remove it; this may take a little longer if
            it needs checking.
          </li>
          <li>
            If you have an account, you can also{" "}
            <Link to="/contribute" className="text-violet-700 hover:underline">
              submit a correction directly
            </Link>
            .
          </li>
        </ul>
        <p className="text-sm text-gray-600 leading-relaxed mt-3">
          To report something, email{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-violet-700 hover:underline font-medium"
          >
            {CONTACT_EMAIL}
          </a>{" "}
          (or use the <Link to="/contact" className="text-violet-700 hover:underline">Contact</Link>{" "}
          page) with a link to the record and what's wrong with it. Since KalpaDB's content comes
          from volunteer contributors rather than a professional editorial process, we can't
          guarantee every record is error-free — but we do commit to acting promptly once
          something is reported to us.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Your account, your choice</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          Want your account data deleted or exported? Email us at{" "}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-violet-700 hover:underline font-medium"
          >
            {CONTACT_EMAIL}
          </a>
          . Note that catalogue edits you've made stay in the catalogue after your account is
          deleted (removing them would mean removing verified factual content, not just your
          personal data) — but your profile, email, and login details are deleted.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Changes to this policy</h2>
        <p className="text-sm text-gray-600 leading-relaxed">
          If this policy changes in a meaningful way, we'll update the date at the top of this
          page.
        </p>
      </section>

      <p className="text-xs text-gray-400">
        This page is a plain-language summary, not legal advice. See also our{" "}
        <Link to="/license" className="text-violet-700 hover:underline">License &amp; Reuse</Link> page
        for how the catalogue data itself may be reused.
      </p>
    </div>
  );
}
