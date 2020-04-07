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
    this.activeUsers = {};
    Object.entries(activeUsers).forEach(([id, activeUser]) => {
      this.activeUsers[id] = activeUser.copy();
    });

    if (senderCaret) {
      this.senderCaret = senderCaret.copy();
    }
    if (delta) {
      this.delta = delta.copy();
    }
  }
}

export default Checkpoint;
