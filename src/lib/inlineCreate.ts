import { admin, volunteer, type EditSubmission } from "./api";
import type { PickerItem } from "../components/EntityPicker";

/**
 * Inline-create an entity (name only) from a picker and return it as a picker
 * item. Works for both callers who can create live records:
 *  - trusted volunteers (users.auto_approve): the backend auto-applies the
 *    submission, so record_id already carries the live id;
 *  - admins: the submission comes back pending, so chain the review call.
 * Regular volunteers never get an onCreate handler, so neither path runs.
 */
async function createInline(name: string, sub: EditSubmission): Promise<PickerItem> {
  if (sub.record_id != null) return { id: sub.record_id, name };
  const entry = await admin.queue.review(sub.edit_id, true, "Direct admin entry");
  return { id: entry.record_id!, name };
}

export async function createPersonInline(
  name: string,
  opts?: { allowDuplicate?: boolean },
): Promise<PickerItem> {
  return createInline(name, await volunteer.submitPerson({ name }, opts?.allowDuplicate));
}

export async function createPublisherInline(
  name: string,
  opts?: { allowDuplicate?: boolean },
): Promise<PickerItem> {
  return createInline(name, await volunteer.submitPublisher({ name }, opts?.allowDuplicate));
}
