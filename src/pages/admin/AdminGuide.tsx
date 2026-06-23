import { Link } from "react-router-dom";

/**
 * Admin guide — special admin-only actions and how they behave.
 * Keep this updated as admin features are added or changed.
 */
const LAST_UPDATED = "23 June 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

export default function AdminGuide() {
  return (
    <div className="max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900 mb-1">Admin Guide</h1>
      <p className="text-sm text-gray-500 mb-6">
        Special actions available to admins, and how they behave. Last updated {LAST_UPDATED}.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 mb-8 text-sm text-amber-800">
        <strong>Key difference from volunteers:</strong> your add/edit actions write{" "}
        <em>live</em> (they’re auto-approved). Deletes are immediate and not queued. Double-check
        before saving.
      </div>

      <Section title="Dashboard & stats">
        <p>
          The <Link to="/admin" className="text-violet-700 hover:underline">Dashboard</Link> shows
          catalogue counts and pending-work cards (volunteer requests, edit queue). Counts are
          pre-computed; use <strong>Refresh Stats</strong> to recompute them on demand. The stat
          cards link to the relevant pages.
        </p>
      </Section>

      <Section title="Edit Queue — reviewing submissions">
        <p>
          <Link to="/admin/queue" className="text-violet-700 hover:underline">Edit Queue</Link>{" "}
          holds volunteer submissions. For each, review the before/after diff and the submitter’s
          note, then <strong>approve</strong> or <strong>reject</strong> (a rejection reason is sent
          back to the submitter).
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Conflict detection:</strong> on approve, if the underlying record changed since
            the submission was made, you’ll be warned. You can <strong>force-approve</strong> to
            apply anyway — only do this when you’re sure the submission is still correct.
          </li>
          <li>Approving applies the change to the live catalogue immediately.</li>
        </ul>
      </Section>

      <Section title="Direct add & edit (auto-approved)">
        <p>
          As an admin, the <Link to="/admin/add" className="text-violet-700 hover:underline">Add
          Records</Link> page and the “Edit” buttons on records write straight to the catalogue —
          your own submission is auto-approved, so changes are live at once. (Volunteers’ identical
          actions queue for review instead.)
        </p>
      </Section>

      <Section title="Linking translations">
        <p>
          On a book’s “Edit” page, the “Translations &amp; editions” box links a work to its
          translation (or original) in another language. Set the{" "}
          <em>This work is the original / translation</em> toggle first so the direction is stored
          correctly, then search and pick the other work — your add is auto-approved and shows on
          both works’ pages at once. Use “Remove” to delete a link (admin only; immediate). If the
          original isn’t in the catalogue, use the book form’s “Based on an external work” field
          instead.
        </p>
      </Section>

      <Section title="Volunteer requests">
        <p>
          <Link to="/admin/volunteer-requests" className="text-violet-700 hover:underline">Volunteer
          Requests</Link> lists users who’ve asked for contributor access. Approve to grant the
          volunteer role (they can then add/suggest edits), or decline. The dashboard badge shows
          how many are pending.
        </p>
      </Section>

      <Section title="Users">
        <p>
          <Link to="/admin/users" className="text-violet-700 hover:underline">Users</Link> lists
          accounts and lets you manage roles (user / volunteer / admin) and account state. Promote
          trusted contributors; be conservative granting admin.
        </p>
      </Section>

      <Section title="Genre tagging">
        <p>
          <Link to="/admin/tagging" className="text-violet-700 hover:underline">Genre Tagging</Link>{" "}
          is a fast workflow for assigning genres/tags to works in bulk — useful for back-filling
          taxonomy across the catalogue.
        </p>
      </Section>

      <Section title="Catalogue (series, tags, persons, publishers)">
        <p>
          <Link to="/admin/catalogue" className="text-violet-700 hover:underline">Catalogue</Link>{" "}
          manages supporting entities: create book series and tags, and search to{" "}
          <strong>edit or delete</strong> persons and publishers. Series can be edited or deleted
          from their own <Link to="/series" className="text-violet-700 hover:underline">series</Link>{" "}
          page using the Edit button.
        </p>
        <p className="text-amber-700">
          Deletes are permanent and immediate. Before deleting a person/publisher, make sure they
          aren’t still credited on works — prefer merging/fixing over deleting.
        </p>
      </Section>

      <Section title="Activity log">
        <p>
          <Link to="/admin/audit" className="text-violet-700 hover:underline">Activity Log</Link>{" "}
          records who changed what and when — use it to audit recent edits and trace mistakes.
        </p>
      </Section>

      <Section title="Multilingual fields">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Romanised titles</strong> are auto-generated for search. On a work’s edit screen
            you can override the romanisation; once you edit it, the value is <em>pinned</em> and the
            auto-romaniser won’t overwrite it. Leave it untouched to keep it auto-updating.
            (Non-Bengali languages currently use a generic romanisation that may need manual
            polishing.)
          </li>
          <li>
            <strong>Names</strong> are canonical in English. Set a person/publisher’s{" "}
            <em>Primary language</em> and the “Name in …” field to record the native-script form,
            which is featured on the detail page next to the English name.
          </li>
        </ul>
      </Section>

      <Section title="News">
        <p>
          <Link to="/admin/news" className="text-violet-700 hover:underline">News</Link> manages
          site announcements (draft / published / archived), shown on the home page.
        </p>
      </Section>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 mt-8">
        For general site &amp; contributor help, see the{" "}
        <Link to="/help" className="text-violet-700 hover:underline">Help &amp; Contributor Guide</Link>.
      </p>
    </div>
  );
}
