class Checkpoint {
  /**
  * Creates a new Checkpoint instance.
  * Parameters:
  *   selfCaret: Caret
  *   activeUsers: object, int -> ActiveUser
  *   senderCaret: Caret
  *   delta: Delta
  */
  constructor(selfCaret, activeUsers, senderCaret, delta) {
    this.selfCaret = selfCaret.copy();
    this.activeUsers = { ...activeUsers };
    if (senderCaret) {
      this.senderCaret = senderCaret.copy();
    }
    if (delta) {
      this.delta = delta.copy();
    }
  }
}

export default Checkpoint;
