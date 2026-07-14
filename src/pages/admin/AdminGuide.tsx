import { Link } from "react-router-dom";

/**
 * Admin guide — special admin-only actions and how they behave.
 * Keep this updated as admin features are added or changed.
 */
const LAST_UPDATED = "14 July 2026";

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

      <Section title="Related works">
        <p>
          The <strong>“Related works”</strong> section on a book’s, story’s, comic’s or magazine’s
          edit page records a directional link to another catalogued work — a sequel, prequel,
          spin-off, retelling, fix-up, or (for magazines) a serial rename. Pick the other work, choose
          the relationship, add an optional note, and save (auto-approved for you; volunteers’ links
          queue for review). “Remove” deletes a link (admin only; immediate).
        </p>
        <p className="text-gray-500">
          Like awards, external links and translations, this lives on the <strong>Edit</strong> page,
          not the Add form — each links to an existing record, so the work must be created first. On
          the add forms, create the work, then follow the “Edit / link works →” link to add these.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Record it once — it shows on both works.</strong> The reverse side is generated
            automatically: mark work A <em>Sequel to</em> B and B’s page reads <em>Prequel of</em> A;
            a novel marked <em>Fix-up of</em> a story makes the story read <em>Fixed up into</em> the
            novel. Symmetric links (<em>Companion to</em>, <em>Part of series</em>) read the same on
            both sides. Never enter the mirror link yourself — you’d get a duplicate.
          </li>
          <li>
            <strong>Options depend on the work type.</strong> Magazines offer only the serial pair —
            <em> Continues</em> / <em>Continued by</em> — for titles that renamed or merged, and the
            picker is limited to other magazines. Books, stories and comics offer the narrative set
            (sequel, prequel, spin-off, companion, fix-up, retelling, inspired by, part of series)
            and can link to any work.
          </li>
          <li>
            <strong>Not the same as translations or adaptations.</strong> Use “Translations &amp;
            editions” for the <em>same</em> work in another language, and this section for a{" "}
            <em>different but connected</em> work in the same language. Approved links appear in the
            “Related works” block on both public work pages.
          </li>
        </ul>
      </Section>

      <Section title="Awards & external links">
        <p>
          Every book, story, comic, magazine and person edit page has an{" "}
          <strong>“Awards &amp; external links”</strong> section. Both editors save immediately,
          separately from the main form — you don’t click the page’s Save button for them.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Awards.</strong> Pick the award, then a category within it, plus year and
            result (winner / shortlist / nominee …). If the award or category isn’t in the list yet,
            use the small “+ new award / + new category” inputs (admin only) to create it inline —
            it becomes available everywhere at once. Existing results have <em>Edit</em> (change
            category/year/result/notes) and <em>Remove</em> (admin only, immediate). To maintain the
            award list itself (rename, add categories, retire an award), use{" "}
            <Link to="/admin/awards" className="text-violet-700 hover:underline">Award Management</Link>;
            the public <Link to="/awards" className="text-violet-700 hover:underline">Awards</Link>{" "}
            page lists every award with its winners rolled up.
          </li>
          <li>
            <strong>External links.</strong> Goodreads, Wikipedia, WorldCat, Open Library or other
            reference URLs, with an optional label. Add, edit or remove them the same way. For
            digital-archive scans of magazine issues, use the issue’s scan repository instead.
          </li>
          <li>
            Volunteers’ additions and edits queue for review; removals are admin-only. Award results
            display on the work and person pages once approved.
          </li>
        </ul>
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
            <strong>“Credited as” bylines (pen names).</strong> Under <em>every</em> person-role
            picker — authors, translators, editors, illustrators, cover artists, all comic
            creator roles, and magazine-issue credits — each selected person gets an optional{" "}
            <em>credited as</em> field — fill it with the name <em>as printed</em> when it differs
            from the canonical record (e.g. a story bylined <em>রনিন</em> credited to Goutam
            Mandal). Leave blank for the canonical name. One byline per person per work: it
            applies to every role that person holds on that work. Detail pages and tables of contents show
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

      <Section title="Messages — the user inbox">
        <ul className="list-disc pl-5 space-y-1.5">
          <li>
            <Link to="/admin/messages" className="text-violet-700 hover:underline">Messages</Link>{" "}
            holds one thread per user, shared by the whole admin team — any admin can read and
            reply to any thread, and the nav badge counts user messages nobody has read yet.
            Users see the reply in their own Messages page (account menu); no emails are sent.
          </li>
          <li>
            To message a user who has never written in, open{" "}
            <Link to="/admin/users" className="text-violet-700 hover:underline">Users</Link> and
            click <em>Message</em> next to their name — that opens their (empty) thread.
          </li>
          <li>
            Everything is plain text, both ways. Users are rate-limited (10 messages/hour,
            30/day); admins are not.
          </li>
          <li>
            <strong>Muting.</strong> The thread header has a mute control (1 hour to 30 days,
            optional reason). A muted user can still read but not send; they see the expiry time.
            Mutes are recorded in the activity log and can be lifted early with <em>Unmute</em>.
            Admin accounts cannot be muted.
          </li>
        </ul>
      </Section>

      <Section title="Users, roles & the owner account">
        <p>
          <Link to="/admin/users" className="text-violet-700 hover:underline">Users</Link> lists
          accounts and lets you manage roles (user / volunteer / admin) and account state. Promote
          trusted contributors; be conservative granting admin.
        </p>
        <p>
          One account carries the <strong>Owner</strong> badge — the site owner. The privilege
          rules (enforced by the server, mirrored in the UI):
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Admins</strong> manage user ↔ volunteer roles and can deactivate those
            accounts. They cannot grant or remove the admin role, cannot modify another admin’s
            account, and cannot touch the owner account.
          </li>
          <li>
            <strong>Only the owner</strong> can promote someone to admin, demote an admin, or
            deactivate an admin account.
          </li>
          <li>
            <strong>Nobody edits their own row</strong> — not even the owner — so you can’t
            accidentally demote or lock yourself out. Deactivating an account signs it out
            immediately (every request re-checks account state).
          </li>
        </ul>
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

      <Section title="Backups & restore">
        <p>
          Two automated backups run as GitHub Actions on the (private) backend repo and are kept
          for <strong>30 days</strong> as private artifacts — download them from the repo’s{" "}
          <strong>Actions</strong> tab (open the run, artifact at the bottom). Requires access to
          the GitHub repo, so in practice this is for the site owner.
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Database</strong> (“DB backup” workflow): nightly at 03:00 IST, a full{" "}
            <code>pg_dump</code> of the production database (~1.5 MB). Roughly 30 restore points at
            any time.
          </li>
          <li>
            <strong>Images</strong> (“R2 image backup” workflow): weekly, Sunday 03:30 IST, the
            whole cover/illustration/photo bucket as a tar (~56 MB).
          </li>
          <li>
            <strong>Before anything risky</strong> (bulk import, mass delete, merge spree), take a
            fresh backup on demand: Actions → pick the workflow → <em>Run workflow</em>.
          </li>
        </ul>
        <p>
          <strong>Restoring the database</strong>: download and unzip the artifact, then run{" "}
          <code>pg_restore --clean --if-exists -d "&lt;database-url&gt;" kalpa-YYYY-MM-DD.dump</code>{" "}
          with the psql-style Neon URL (the one ending in <code>?sslmode=require</code>, from the
          credentials file — <em>not</em> the app’s <code>+asyncpg</code> URL). This rewinds the{" "}
          <em>entire</em> database to the snapshot — everything entered after it (edits, users,
          ratings) is lost, so prefer fixing targeted damage by hand via the Activity Log and only
          restore wholesale after large-scale loss.
        </p>
        <p>
          <strong>Restoring images</strong>: unzip and untar the artifact, then{" "}
          <code>aws s3 sync kalpa-images s3://kalpa-images --endpoint-url "&lt;R2-endpoint&gt;"</code>{" "}
          with the R2 keys as <code>AWS_ACCESS_KEY_ID</code>/<code>AWS_SECRET_ACCESS_KEY</code>.
          Sync only adds/overwrites files — it never deletes newer uploads. Exact commands also live
          in the workflow files’ header comments (<code>.github/workflows/db-backup.yml</code> and{" "}
          <code>r2-backup.yml</code>).
        </p>
        <p className="text-amber-700">
          A failed scheduled backup emails the repo owner — don’t ignore those mails; a broken
          backup is only discovered when you need it.
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
