import { Link } from "react-router-dom";

/**
 * Admin guide — special admin-only actions and how they behave.
 * Keep this updated as admin features are added or changed.
 */
const LAST_UPDATED = "7 July 2026";

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
          On a book’s, story’s or magazine’s “Edit” page, the “Translations &amp; editions” box
          links a work to its translation (or original) in another language. Set the{" "}
          <em>This work is the original / translation</em> toggle first so the direction is stored
          correctly, then search and pick the other work — your add is auto-approved and shows on
          both works’ pages at once. Use “Remove” to delete a link (admin only; immediate). If the
          original isn’t in the catalogue, use the book form’s “Based on an external work” field
          instead.
        </p>
      </Section>

      <Section title="Stories, anthologies & magazine issues">
        <p>
          A story is a single record linked to every container it appears in. The same machinery
          drives both the contributor forms and the read-only roll-ups, so it helps to know how the
          links behave when you add/edit or approve a story.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Many-to-many links.</strong> A story can appear in any number of books{" "}
            <em>and</em> magazine issues. The “Appears in (anthologies / collections)” picker is
            multi-select, and the magazine-issue picker adds issues as chips. Both use{" "}
            <strong>replace-semantics</strong> on save: the list you submit becomes the full set of
            links for that story.{" "}
            <em>Example:</em> if a story is linked to 3 books and you save with 2 in the picker, the
            third link is removed. Existing page ranges on links you keep are preserved.
          </li>
          <li>
            <strong>“Credited as” bylines (pen names).</strong> Under the Authors / Translators
            pickers on book and story forms, each selected person gets an optional{" "}
            <em>credited as</em> field — fill it with the name <em>as printed</em> when it differs
            from the canonical record (e.g. a story bylined <em>রনিন</em> credited to Goutam
            Mandal). Leave blank for the canonical name. Detail pages and tables of contents show
            “Name (as byline)”. Always credit the real person; never create a separate pen-name
            person record. The field suggests the person’s recorded aliases and name forms as you
            type; a byline that matches none of them gets a gentle hint to also record it as a pen
            name on the person (nothing is added automatically — follow the link and add it if
            it’s genuine, ignore it if the byline is a one-off). Bylines are searchable either
            way: person search and the duplicate scanner match them even when they were never
            formalised as aliases.
          </li>
          <li>
            <strong>Table of contents &amp; Contributors are computed, not entered.</strong> A book’s
            Table of contents and the Contributors list on books and magazine issues are{" "}
            <em>derived</em> from the stories linked to that container and from those stories’ own
            author/translator credits — de-duplicated automatically. There’s no field to hand-edit
            them; to fix a contributor, fix the credit on the underlying story.
          </li>
          <li>
            <strong>“First published in” is one venue at a time.</strong> A story’s original venue is
            a catalogued book <em>or</em> a catalogued magazine issue <em>or</em> free text — never
            two at once (enforced by a database constraint). Switching from one to another in the
            form clears the previous link automatically on save, so you can’t leave a stale pointer
            behind. Keep it distinct from “Appears in”: first-published = the single original venue;
            appears-in = every reprint.
          </li>
          <li>
            <strong>Page ranges.</strong> A story’s page range within a book/issue is stored per
            link. The story-side pickers preserve ranges set elsewhere; the issue editor doesn’t edit
            ranges yet (they’re kept on save, just not editable there).
          </li>
          <li>
            <strong>Deleting an issue (admin only).</strong> The “Delete issue” button on an
            issue’s edit form removes that one issue with its credits and scan links — immediate,
            like all admin deletes. Stories that appeared in it are only unlinked, never deleted;
            a story whose “first published in” pointed at the issue keeps its record but loses
            that link.
          </li>
        </ul>
        <p className="text-amber-700">
          When approving a volunteer story edit, the container links show as a coarse “changed” in
          the diff rather than field-by-field — confirm the picker selections match the submitter’s
          note before approving.
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

      <Section title="Genre & tag tagging">
        <p>
          <Link to="/admin/tagging" className="text-violet-700 hover:underline">Genre &amp; Tag Tagging</Link>{" "}
          is a fast workflow for assigning both <strong>genres</strong> (the coarse primary
          classification) and <strong>tags</strong> (fine-grained subgenres like Cyberpunk or
          Kalpavigyan) to works in bulk — expand a work to edit each set independently.
        </p>
        <p>
          <Link to="/admin/tags" className="text-violet-700 hover:underline">Tag Management</Link>{" "}
          is where you build the tag vocabulary itself: create tags under a parent (a two-level
          tree), or delete unused ones. A tag can only be deleted once it has no child tags and is
          no longer assigned to any work.
        </p>
      </Section>

      <Section title="Catalogue (series, tags, persons, publishers)">
        <p>
          <Link to="/admin/catalogue" className="text-violet-700 hover:underline">Catalogue</Link>{" "}
          manages supporting entities: create book series and tags, and search to{" "}
          <strong>edit or delete</strong> persons and publishers. Series can also be created from
          the Add Records “Series” tab, and edited or deleted from their own{" "}
          <Link to="/series" className="text-violet-700 hover:underline">series</Link> page using
          the Edit button — including the URL slug (auto-suggested from the name; type one manually
          for non-Latin names).
        </p>
        <p className="text-amber-700">
          Deletes are permanent and immediate. Before deleting a person/publisher, make sure they
          aren’t still credited on works — prefer merging/fixing over deleting.
        </p>
      </Section>

      <Section title="Find Duplicates — scan & merge">
        <p>
          <Link to="/admin/duplicates" className="text-violet-700 hover:underline">Find Duplicates</Link>{" "}
          scans a whole category (people, publishers, books, stories, magazines, issues) for records
          that look like the same thing entered twice. Matching is fuzzy and cross-script: honorifics
          (ড., শ্রী, Dr.) and byline labels (মূল রচনা:, অনুবাদ:) are ignored, and Bengali names are
          compared against romanised ones. A scan can take up to a minute.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Every record in a cluster is a <strong>clickable link</strong> (opens in a new tab) — check
            details before deciding. The <em>Links</em> column counts how many credits/links point at
            each version.
          </li>
          <li>
            <strong>Merge</strong>: pick the version to keep (radio), tick the ones to merge in, and
            confirm. All credits, links, ratings and bookmarks move to the keeper; its blank fields
            are filled from the merged records; a merged person’s other names are kept as aliases.
            The merged records are then deleted — <span className="text-amber-700">this cannot be
            undone</span>.
          </li>
          <li>
            <strong>Not duplicates</strong>: permanently rules the cluster’s records as distinct —
            future scans skip them (undo at the bottom of the page).
          </li>
          <li>
            <strong>Ignore for now</strong>: just hides the cluster on this device until you clear it.
          </li>
          <li>
            Amber badges (⚠ surname/given name/authors differ) mean the match is probably two
            different people or works with similar names — check before merging.
          </li>
        </ul>
      </Section>

      <Section title="Activity log">
        <p>
          <Link to="/admin/audit" className="text-violet-700 hover:underline">Activity Log</Link>{" "}
          records who changed what and when — use it to audit recent edits and trace mistakes.
          Merges appear as <em>duplicates_merged</em> with a full breakdown of repointed links.
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
