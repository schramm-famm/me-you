class Delta {
  /**
  * Creates a new Delta instance.
  * Parameters:
  *   caretStart: int
  *   caretEnd: int
  *   doc: int
  */
  constructor(caretStart, caretEnd, doc) {
    this.caretStart = caretStart;
    this.caretEnd = caretEnd;
    if (doc || doc === 0) {
      this.doc = doc;
    }
  }

  /**
  * copy returns a new Delta instance with the current instance's properties'
  * values.
  * Returns: Delta
  */
  copy() {
    return new Delta(this.caretStart, this.caretEnd, this.doc);
  }
}

export default Delta;
