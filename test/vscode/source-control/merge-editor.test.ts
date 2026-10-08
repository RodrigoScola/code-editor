import { describe, expect, it } from "vitest";
import { MergeModel } from "../../../src/Scm/mergeEditor.js";

// The 3-way merge editor (Open in Merge Editor). Proposed
// src/Scm/mergeEditor.ts:
//   new MergeModel(base, input1, input2)   input1 = incoming, input2 = current
//   model.conflicts() -> regions where both sides changed the same lines
//     differently: [{ id, base, input1, input2, handled }]
//   changes that only one side made, or that both made the same way, are
//   in the result already
//   model.accept(id, "input1" | "input2" | "both")   both = input1 then input2
//   model.reset(id)
//   model.result() -> the merged text
//   model.unresolvedCount()
//   model.complete() -> true when nothing is unresolved (the file can be
//     staged); false otherwise

const base = "a\nb\nc\nd\ne";

describe("MergeModel", () => {
  it("takes changes from either side when they don't overlap", () => {
    const model = new MergeModel(base, "A\nb\nc\nd\ne", "a\nb\nc\nd\nE");

    expect(model.conflicts()).toEqual([]);
    expect(model.result()).eq("A\nb\nc\nd\nE");
  });

  it("the same change on both sides is not a conflict", () => {
    const model = new MergeModel(base, "a\nX\nc\nd\ne", "a\nX\nc\nd\ne");

    expect(model.conflicts()).toEqual([]);
    expect(model.result()).eq("a\nX\nc\nd\ne");
  });

  it("different changes to the same lines are a conflict", () => {
    const model = new MergeModel(base, "a\nINCOMING\nc\nd\ne", "a\nCURRENT\nc\nd\ne");

    expect(model.conflicts()).toHaveLength(1);
    expect(model.unresolvedCount()).eq(1);
  });

  it("accept input1 takes the incoming side", () => {
    const model = new MergeModel(base, "a\nINCOMING\nc\nd\ne", "a\nCURRENT\nc\nd\ne");
    const [conflict] = model.conflicts();

    model.accept(conflict.id, "input1");

    expect(model.result()).eq("a\nINCOMING\nc\nd\ne");
    expect(model.unresolvedCount()).eq(0);
  });

  it("accept input2 takes the current side", () => {
    const model = new MergeModel(base, "a\nINCOMING\nc\nd\ne", "a\nCURRENT\nc\nd\ne");

    model.accept(model.conflicts()[0].id, "input2");

    expect(model.result()).eq("a\nCURRENT\nc\nd\ne");
  });

  it("accept both puts input1 before input2", () => {
    const model = new MergeModel(base, "a\nINCOMING\nc\nd\ne", "a\nCURRENT\nc\nd\ne");

    model.accept(model.conflicts()[0].id, "both");

    expect(model.result()).eq("a\nINCOMING\nCURRENT\nc\nd\ne");
  });

  it("reset puts the base back and makes it unresolved again", () => {
    const model = new MergeModel(base, "a\nINCOMING\nc\nd\ne", "a\nCURRENT\nc\nd\ne");
    const [conflict] = model.conflicts();
    model.accept(conflict.id, "input1");

    model.reset(conflict.id);

    expect(model.result()).eq(base);
    expect(model.unresolvedCount()).eq(1);
  });

  it("complete only succeeds once every conflict is handled", () => {
    const model = new MergeModel(base, "a\nINCOMING\nc\nd\ne", "a\nCURRENT\nc\nd\ne");

    expect(model.complete()).eq(false);

    model.accept(model.conflicts()[0].id, "input2");
    expect(model.complete()).eq(true);
  });

  it("keeps a resolved conflict and an automatic change together", () => {
    const model = new MergeModel(base, "A\nINCOMING\nc\nd\ne", "a\nCURRENT\nc\nd\nE");

    model.accept(model.conflicts()[0].id, "input1");

    expect(model.result()).eq("A\nINCOMING\nc\nd\nE");
  });
});
