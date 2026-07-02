import { Link } from "react-router-dom";

/**
 * Contributor / visitor help & FAQ for the whole site.
 * Keep this updated as user-facing features are added or changed.
 */
const LAST_UPDATED = "1 July 2026";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-8 scroll-mt-20">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{title}</h2>
      <div className="text-sm text-gray-600 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}

const TOC: { id: string; label: string }[] = [
  { id: "what", label: "What is KalpaDB" },
  { id: "finding", label: "Finding things" },
  { id: "search-tips", label: "Search tips (scripts & spelling)" },
  { id: "account", label: "Your account" },
  { id: "shelf", label: "Ratings, shelf & lists" },
  { id: "contributing", label: "Becoming a contributor" },
  { id: "adding", label: "Adding & editing records" },
  { id: "work-types", label: "Work types" },
  { id: "stories", label: "Stories, anthologies & magazines" },
  { id: "conventions", label: "Data conventions" },
  { id: "faq", label: "FAQ" },
  { id: "reuse", label: "Reuse & citation" },
];

export default function HelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Help &amp; Contributor Guide</h1>
      <p className="text-sm text-gray-500 mb-6">
        How to use KalpaDB and how to contribute. Last updated {LAST_UPDATED}.
      </p>

      <nav className="mb-10 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">On this page</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
          {TOC.map((t) => (
            <li key={t.id}>
              <a href={`#${t.id}`} className="text-violet-700 hover:underline">
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="what" title="What is KalpaDB">
        <p>
          KalpaDB is a community-curated catalogue of Indian speculative fiction — science fiction,
          fantasy, horror and related genres — across Indian languages and media. It records works
          (books, stories, comics, magazines, screen &amp; audio), the people behind them, and the
          publishers who produced them.
        </p>
      </Section>

      <Section id="finding" title="Finding things">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link to="/browse" className="text-violet-700 hover:underline">Browse</Link> — page
            through the whole catalogue and filter by type, language, genre, and subgenre tag
            (e.g. Cyberpunk, Kalpavigyan).
          </li>
          <li>
            <Link to="/explore" className="text-violet-700 hover:underline">Explore</Link> — visual
            breakdowns of the catalogue (by genre, publisher, and author); click a bar to jump to
            the matching list.
          </li>
          <li>
            <Link to="/search" className="text-violet-700 hover:underline">Search</Link> — free-text
            search across works, people, and publishers at once.
          </li>
          <li>
            <Link to="/persons" className="text-violet-700 hover:underline">People</Link> and{" "}
            <Link to="/publishers" className="text-violet-700 hover:underline">Publishers</Link> —
            browse authors/creators and publishing houses.
          </li>
          <li>
            <Link to="/series" className="text-violet-700 hover:underline">Series</Link> — browse
            book and comic series; each series page lists its works in reading order.
          </li>
          <li>
            <Link to="/magazines" className="text-violet-700 hover:underline">Magazines</Link> —
            browse magazine titles; open one to see its issues in date order, and each issue’s
            contents. (Magazines have their own section because a magazine is a publication venue,
            not a single work — so they aren’t mixed into the works browse.)
          </li>
          <li>Every work, person, and publisher has its own detail page with full information.</li>
        </ul>
      </Section>

      <Section id="search-tips" title="Search tips (scripts & spelling)">
        <p>
          KalpaDB is multi-script. You can search in either the native script or in Latin
          (romanised) letters:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Type a title or name in its <strong>original script</strong> (e.g. Bengali) and it
            matches directly.
          </li>
          <li>
            Or type it <strong>romanised in English letters</strong> — titles carry an automatic
            romanisation, so e.g. <em>arthatrishna</em> finds অর্থতৃষ্ণা.
          </li>
          <li>
            Search is <strong>fuzzy</strong>: spelling variants still hit (e.g. “roy” finds “Ray”,
            “orthotrishna” still finds “arthatrishna”). Don’t worry about exact spelling.
          </li>
          <li>People &amp; publishers match on their English name and any native-script name.</li>
        </ul>
      </Section>

      <Section id="account" title="Your account">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <Link to="/register" className="text-violet-700 hover:underline">Create an account</Link>,
            then confirm your email from the verification link we send you.
          </li>
          <li>
            <Link to="/login" className="text-violet-700 hover:underline">Sign in</Link>; if you
            forget your password, use the “Forgot password” link to reset it by email.
          </li>
          <li>A basic account lets you rate, bookmark, track reading, and build lists.</li>
        </ul>
      </Section>

      <Section id="shelf" title="Ratings, shelf & lists">
        <ul className="list-disc pl-5 space-y-1">
          <li>Rate works out of 5 stars and optionally leave a review.</li>
          <li>
            Bookmark works and track reading status (want to read / reading / finished / abandoned)
            — all collected under <Link to="/shelf" className="text-violet-700 hover:underline">My Shelf</Link>.
          </li>
          <li>Build curated lists (e.g. “Best Bengali SF of the 80s”).</li>
          <li>Follow an author/creator to keep track of their work.</li>
        </ul>
      </Section>

      <Section id="contributing" title="Becoming a contributor">
        <p>
          Anyone with an account can apply to contribute. Open{" "}
          <Link to="/contribute" className="text-violet-700 hover:underline">Contribute</Link> and
          request volunteer access. An admin reviews the request, and once you’re approved you can
          add and edit records.
        </p>
        <p>
          The first time you contribute you’ll be asked to accept the contributor agreement — your
          contributions are published under the project’s open licence (see{" "}
          <Link to="/license" className="text-violet-700 hover:underline">License</Link>).
        </p>
        <p>
          <strong>How review works:</strong> volunteer submissions go into a review queue and are
          checked by an admin before they go live. You can watch the status of everything you’ve
          submitted under <Link to="/my-submissions" className="text-violet-700 hover:underline">My
          Submissions</Link>, and withdraw a pending submission if you change your mind.
        </p>
      </Section>

      <Section id="adding" title="Adding & editing records">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Add</strong> new books, people, publishers, and series from the{" "}
            <Link to="/contribute" className="text-violet-700 hover:underline">Contribute</Link> page.
          </li>
          <li>
            <strong>Suggest an edit</strong> from any work, person, publisher, or series page using
            the “Suggest an edit” button — add a note for the reviewer explaining your change.
          </li>
          <li>
            If you try to add something that may already exist, you’ll see possible duplicates first
            so you can avoid creating a second copy.
          </li>
          <li>
            Link people to works using their credited role (author, editor, translator, illustrator,
            cover artist) and attach publishers to editions.
          </li>
        </ul>
      </Section>

      <Section id="work-types" title="Work types">
        <p>
          Every record in the catalogue is a <strong>work</strong> of one of five types. The type
          decides which fields and credit roles you’ll see on its add/edit form and detail page:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Book</strong> — a standalone novel, an anthology, or a collection. Carries
            editions, formats (hardcover/paperback/ebook…), and a series position.{" "}
            <em>Example:</em> <em>Professor Shonku Samagra</em> (a collection), or{" "}
            <em>Kalpabigyan Samagra</em> (an anthology of many authors’ stories).
          </li>
          <li>
            <strong>Story</strong> — a single short story, novelette, or novella. A story usually
            lives <em>inside</em> one or more books or magazine issues rather than on its own.{" "}
            <em>Example:</em> Satyajit Ray’s “ব্যোমযাত্রীর ডায়রি” (<em>Byomjatrir Diary</em>).
          </li>
          <li>
            <strong>Comic</strong> — a graphic work, with its own creator roles (writer, artist,
            inker, colorist, letterer).
          </li>
          <li>
            <strong>Magazine</strong> — a periodical <em>title</em> (e.g. <em>Sandesh</em>,{" "}
            <em>Anandamela</em>). Individual published <strong>issues</strong> hang off it, and
            stories appear inside those issues. Because a magazine is a publication venue rather than
            a single work, magazine titles live in their own{" "}
            <Link to="/magazines" className="text-violet-700 hover:underline">Magazines</Link>{" "}
            section, not in the works browse.
          </li>
          <li>
            <strong>Media</strong> — screen, audio, or interactive SF (films, web series, audio
            dramas, games), with seasons/episodes and screen credits.
          </li>
        </ul>
        <p>
          On the <Link to="/browse" className="text-violet-700 hover:underline">Browse</Link> page
          you can filter by type to see only books, only stories, and so on.
        </p>
      </Section>

      <Section id="stories" title="Stories, anthologies & magazines">
        <p>
          Indian SF has a deep magazine and anthology tradition: the <em>same</em> story is often
          first printed in a magazine, then reprinted in one or more “best of” collections over the
          years. KalpaDB models this so a story is recorded <strong>once</strong> and linked to every
          place it appears.
        </p>

        <p className="font-medium text-gray-800 mt-3">Adding a story</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Add a story from the <Link to="/contribute" className="text-violet-700 hover:underline">Contribute</Link>{" "}
            page (Story tab). Give it a title in its original script — a romanised title for search is
            generated automatically.
          </li>
          <li>
            Set the <strong>story type</strong> (short story, novelette, or novella) and, optionally,
            a word/page count.
          </li>
          <li>
            Credit its <strong>author(s)</strong>, and any <strong>translator(s)</strong> if it’s a
            translated story (e.g. an Asimov story rendered into Bengali).
          </li>
        </ul>

        <p className="font-medium text-gray-800 mt-3">“Appears in” — books and magazine issues</p>
        <p>
          A story can appear in <strong>any number</strong> of containers, and you record each one:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Anthologies / collections (books):</strong> use the “Appears in (anthologies /
            collections)” picker — it’s multi-select, so add every book the story is collected in.{" "}
            <em>Example:</em> “ব্যোমযাত্রীর ডায়রি” appears in both <em>Professor Shonku Samagra</em>{" "}
            and a school anthology — add both.
          </li>
          <li>
            <strong>Magazine issues:</strong> use the magazine-issue picker — search the magazine,
            then pick the specific issue.{" "}
            <em>Example:</em> the story first ran in <em>Sandesh</em>, December 1965 — pick that
            issue.
          </li>
          <li>
            Each appearance can carry the story’s <strong>page range</strong> within that book/issue.
          </li>
        </ul>
        <p>
          On the story’s page these all show under <strong>“Appears in”</strong>, each linking to the
          book or issue.
        </p>

        <p className="font-medium text-gray-800 mt-3">Table of contents (the book/issue side)</p>
        <p>
          Because stories are linked to their containers, the relationship is shown from{" "}
          <em>both</em> directions. An anthology or collection’s page lists a{" "}
          <strong>Table of contents</strong> — every story it contains, with the story’s author and
          page range — and a magazine issue’s page shows the same as its <strong>Contents</strong>.
          You build this simply by linking each story to the book/issue; nothing is typed twice.
        </p>

        <p className="font-medium text-gray-800 mt-3">Contributors (automatic roll-up)</p>
        <p>
          An anthology page also shows a <strong>Contributors</strong> list: everyone credited across
          all of its stories, gathered automatically and de-duplicated.{" "}
          <em>Example:</em> a 20-story anthology by 15 different authors shows all 15 under
          Contributors without anyone entering them on the book — they come from the stories’ own
          author/translator credits. (Translators are flagged as such.) The same roll-up appears on a
          magazine issue.
        </p>

        <p className="font-medium text-gray-800 mt-3">“First published in” vs “Appears in”</p>
        <p>
          These are different on purpose. <strong>Appears in</strong> lists <em>every</em> place a
          story has been printed. <strong>First published in</strong> records the <em>single
          original</em> venue — where it appeared for the very first time. On the story form choose
          one of:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Catalogued book</strong> — pick the book, if the original venue is a book in
            KalpaDB.
          </li>
          <li>
            <strong>Magazine issue</strong> — search the magazine and pick the issue.{" "}
            <em>Example:</em> first published in <em>Sandesh</em>, December 1965.
          </li>
          <li>
            <strong>Other (free text)</strong> — for an original venue that isn’t in the catalogue,
            type it (e.g. “<em>Desh</em> magazine, 1962”).
          </li>
        </ul>
        <p>
          You can add the first-publication <strong>date/year</strong> too. It’s one venue at a time:
          a story is first published in exactly one place, even if it later appears in many.
        </p>
      </Section>

      <Section id="conventions" title="Data conventions">
        <p>A few rules keep the catalogue consistent across languages:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Titles</strong> are entered in the work’s <strong>original script</strong> (e.g.
            Bengali). A romanised version is generated automatically for search; you can edit it on
            the work’s edit screen if the auto version is off.
          </li>
          <li>
            <strong>Names</strong> (people &amp; publishers) are entered in <strong>English</strong>{" "}
            (the established / romanised spelling, e.g. “Satyajit Ray”). You can also add the
            native-script form by choosing a <em>Primary language</em> and filling in the “Name in
            …” field; it’s shown alongside the English name.
          </li>
          <li>
            <strong>Foreign authors</strong> use their English name; a native-script (e.g. Bengali)
            form is optional. We store Indian-language and English forms only.
          </li>
          <li>
            <strong>Editions vs formats:</strong> a new textual edition (revised, illustrated…) is a
            separate record; hardcover/paperback/ebook of the <em>same</em> edition are formats on
            one record — use “Add another format” on the book form to list each one (with its own
            ISBN, page count, price and availability).
          </li>
          <li>
            <strong>Translations:</strong> when the same work exists in another language as a
            separate record, link them in the “Translations &amp; editions” box on the book edit
            page — the link then shows on both works’ pages. Use the{" "}
            <em>This work is the original / translation</em> toggle to set the direction before
            picking the other work, so each side is labelled correctly. If the original{" "}
            <em>isn’t</em> in the catalogue (e.g. a Bengali transcreation of a foreign novel),
            record it instead in the “Based on an external work” box (relationship + original title
            &amp; author).
          </li>
          <li>
            <strong>Genres vs tags:</strong> genres are broad categories (e.g. Hard SF); tags are
            granular themes (e.g. Time Travel, Robots).
          </li>
        </ul>
      </Section>

      <Section id="faq" title="FAQ">
        <p className="font-medium text-gray-800">Do I need an account to read the site?</p>
        <p>No — browsing and searching are open to everyone. An account is needed to rate, save, or contribute.</p>

        <p className="font-medium text-gray-800 mt-3">I can’t read the script — can I still search?</p>
        <p>Yes. Type the title or name in English letters; fuzzy romanised search will find it.</p>

        <p className="font-medium text-gray-800 mt-3">My edit hasn’t appeared yet.</p>
        <p>
          Volunteer edits wait in the review queue until an admin approves them. Track status under{" "}
          <Link to="/my-submissions" className="text-violet-700 hover:underline">My Submissions</Link>.
        </p>

        <p className="font-medium text-gray-800 mt-3">I found a mistake but I’m not a contributor.</p>
        <p>
          Use the report/flag option on the record, or request volunteer access from{" "}
          <Link to="/contribute" className="text-violet-700 hover:underline">Contribute</Link> to fix
          it yourself.
        </p>

        <p className="font-medium text-gray-800 mt-3">Why are there two spellings of a title?</p>
        <p>
          The original-script title is canonical; the Latin one is an automatic romanisation to help
          search and pronunciation.
        </p>
      </Section>

      <Section id="reuse" title="Reuse & citation">
        <p>
          KalpaDB’s data is open. See{" "}
          <Link to="/license" className="text-violet-700 hover:underline">License &amp; Reuse</Link>{" "}
          for the terms and{" "}
          <Link to="/cite" className="text-violet-700 hover:underline">How to cite</Link> if you use
          it in your work.
        </p>
      </Section>

      <p className="text-xs text-gray-400 border-t border-gray-100 pt-4 mt-10">
        Something missing or unclear? Use the report option on a record, or ask an admin. Admins:
        see the <Link to="/admin/guide" className="text-violet-700 hover:underline">Admin Guide</Link>.
      </p>
    </div>
  );
}
