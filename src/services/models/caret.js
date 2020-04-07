class Caret {
  constructor(start, end) {
    this.start = start;
    this.end = end;
  }

  /**
  * Shifts caret relative to an insertion.
  * Parameters:
  *   senderCaret: Caret
  *   delta: Delta
  */
  processAdd(senderCaret, delta) {
    if (senderCaret.end < this.end) {
      this.end += delta;
      if (senderCaret.end <= this.start) {
        this.start += delta;
      }
    }
  }

  /**
  * shiftCaret adjusts the caret based on the caret position of the sender and
  * the deltas in the patch.
  * Parameters:
  *   senderCaret: Caret
  *   delta: Delta
  */
  shiftCaret(senderCaret, delta) {
    // Find range affected by the edit
    const range = {};
    if (senderCaret.start !== senderCaret.end) { // Selection
      range.start = senderCaret.start;
      range.end = senderCaret.end;
    } else if (delta.doc > 0) { // Add
      range.start = senderCaret.start;
      range.end = senderCaret.start + delta.caretStart;
    } else if (delta.caretStart === 0) { // Forward delete
      range.start = senderCaret.start;
      range.end = senderCaret.start - delta.doc;
    } else { // Backward delete
      range.start = senderCaret.start + delta.caretStart;
      range.end = senderCaret.start;
    }

    if (delta.doc > 0 && senderCaret.start === senderCaret.end) {
      // Regular add with a non-selection caret
      this.processAdd(senderCaret, delta.doc);
      return;
    }

    const rangeDelta = range.start - range.end;

    if (range.end < this.end) {
      this.end += rangeDelta;
      if (range.end <= this.start) {
        this.start += rangeDelta;
      } else if (range.start < this.start) {
        this.start = range.start;
      }
    } else if (range.end === this.end) {
      this.start = range.end + rangeDelta;
      this.end = range.end + rangeDelta;
    } else if (range.start < this.end) {
      this.end = range.start;
      if (range.start < this.start) {
        this.start = range.start;
      }
    }

    if (delta.caretStart > 0) {
      const tmpSenderCaret = new Caret(senderCaret.start, senderCaret.start);
      this.processAdd(tmpSenderCaret, delta.caretStart);
    }
  }

  /**
  * copy returns a new Caret instance with the current instance's properties'
  * values.
  * Returns: Caret
  */
  copy() {
    return new Caret(this.start, this.end);
  }
}

export default Caret;
