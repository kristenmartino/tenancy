import test from "node:test";
import assert from "node:assert/strict";
import { reviewState, missingValueLabel, fieldNoteSummary, fieldHighlight, documentName, exceptionMessage, formatFieldValue, pageAfterSourceChange, loadReviewSnapshot, fieldFormat } from "./presentation.ts";

const item = (overrides = {}) => ({ exception_id: "a", resolved: false, resolution: null, severity: "blocking", description: "", exception_type: "missing_required_field", ...overrides });

test("completion never implies human approval; pending/failure never imply clear review", () => {
  assert.equal(reviewState([], "complete").headline, "No open review items");
  assert.equal(reviewState([], "pending").headline, "Review available after extraction");
  assert.equal(reviewState([], "extract_failed").headline, "Extraction needs another attempt");
  assert.equal(reviewState([], "mystery").headline, "Review status unavailable");
});

test("rejected blocking values remain material; accepted/corrected decisions leave active review", () => {
  const summary = reviewState([item(), item({ exception_id: "b", resolved: true, resolution: "reject" }), item({ exception_id: "c", resolved: true, resolution: "edit" }), item({ exception_id: "d", severity: "warning" })], "complete");
  assert.equal(summary.open.length, 2);
  assert.equal(summary.blocking.length, 1);
  assert.equal(summary.rejected.length, 1);
  assert.match(summary.headline, /still blocks/);
  const warnings = reviewState([item({ severity: "warning" })], "complete");
  assert.equal(warnings.blocking.length, 0);
  assert.equal(warnings.open.length, 1);
});

test("missing labels distinguish blanks, absence and extraction gaps regardless of certainty", () => {
  assert.equal(missingValueLabel({ value: null, confidence: 1, source: { match_type: "blank" } }), "Blank in document");
  assert.equal(missingValueLabel({ value: null, source: { match_type: "absent" } }), "Not stated");
  assert.equal(missingValueLabel({ value: null, source: null }), "Not extracted");
});

test("short notes do not fabricate summaries of unknown legal conditions", () => {
  const notes = "May terminate only on written approval after sixty days.";
  assert.equal(fieldNoteSummary({ value: true, notes, source: { match_type: "filled" } }), null);
  assert.equal(fieldNoteSummary({ value: "Sample Lease", notes: "Possible placeholder/sample name", source: null }), "Possible placeholder value");
  assert.equal(fieldNoteSummary({ value: null, notes, source: { match_type: "blank" } }), null);
});

test("source navigation retains multi-line and legacy boxes, and safe no-overlay fallback", () => {
  const boxes = [{ x: .1, y: .2, width: .3, height: .04 }, { x: .1, y: .3, width: .4, height: .04 }];
  assert.deepEqual(fieldHighlight({ source: { page_number: 2, bboxes: boxes } }, "rent.base_monthly_rent").bboxes, boxes);
  assert.deepEqual(fieldHighlight({ source: { page_number: 2, bboxes: [], bbox: boxes[0] } }, "rent.base_monthly_rent").bboxes, [boxes[0]]);
  assert.deepEqual(fieldHighlight({ source: { page_number: 2, bboxes: [] } }, "rent.base_monthly_rent").bboxes, []);
});

test("document names hide storage schemes and known checks retain unknown descriptions", () => {
  assert.equal(documentName("upload://Sample%20Lease.pdf"), "Sample Lease.pdf");
  assert.equal(documentName("https://example.com/leases/Lease.pdf?token=ignore"), "Lease.pdf");
  assert.equal(documentName("upload://bad%filename.pdf"), "bad%filename.pdf");
  const custom = item({ exception_type: "unusual_clause", description: "Fee applies only after 10 days." });
  assert.equal(exceptionMessage(custom), custom.description);
});

test("saved numeric text formats as currency without coercing blank or invalid input", () => {
  assert.equal(formatFieldValue("1250", "currency"), "$1,250.00");
  assert.equal(formatFieldValue(" 1250.50 ", "currency"), "$1,250.50");
  assert.equal(formatFieldValue("", "currency"), "");
  assert.equal(formatFieldValue("by agreement", "currency"), "by agreement");
});

test("a new citation jumps pages, while manual paging remains free after the jump", () => {
  const source = { page: 8, fieldPath: "parties[1].address", bboxes: [] };
  assert.equal(pageAfterSourceChange(1, null, source), 8);
  assert.equal(pageAfterSourceChange(9, source, source), 9);
  assert.equal(pageAfterSourceChange(7, source, source), 7);
  assert.equal(pageAfterSourceChange(7, source, { ...source }), 8);
  assert.equal(pageAfterSourceChange(7, source, null), 7);
});

test("canonical snapshots stay atomic if either read fails after a saved edit", async () => {
  const before = { lease: { extraction: { rent: null } }, exceptions: [item()] };
  let displayed = before;
  const saved = item({ resolved: true, resolution: "edit", correction: { value: "2000" } });
  await assert.rejects(async () => {
    displayed = await loadReviewSnapshot(() => Promise.reject(new Error("read failed")), () => Promise.resolve([saved]));
  }, /read failed/);
  assert.equal(displayed, before);
  assert.equal(displayed.exceptions[0].resolved, false);
  const currentLease = { extraction: { rent: "2000" } };
  await assert.rejects(async () => {
    displayed = await loadReviewSnapshot(() => Promise.resolve(currentLease), () => Promise.reject(new Error("checks failed")));
  }, /checks failed/);
  assert.equal(displayed, before);
  displayed = await loadReviewSnapshot(() => Promise.resolve(currentLease), () => Promise.resolve([saved]));
  assert.equal(displayed.lease, currentLease);
  assert.equal(displayed.exceptions[0], saved);
});

test("queue values use currency formatting only for currency fields", () => {
  assert.equal(formatFieldValue("1250", fieldFormat("deposits.security_deposit")), "$1,250.00");
  assert.equal(formatFieldValue("76706", fieldFormat("property.zip_code")), "76706");
});
