import WSMessage from './wsmessage';

class UserLeave extends WSMessage {
  /**
  * Creates a new UserLeave instance.
  * Parameters:
  *   userId: int
  */
  constructor(userId) {
    const data = { userId };
    super(WSMessage.types.UserLeave, data);
  }

  /**
  * handle removes an active user from the state specified by the UserLeave.
  * Required Parameters:
  *   state: object
  *     state.el: DOMElement
  *     state.activeUsers: object, int -> ActiveUser
  *     state.colourList: []string
  *     state.checkpoint: object
  *       state.checkpoint.content: string
  *       state.checkpoint.version: object, int -> Checkpoint
  */
  handle(state) {
    const { userId } = this.data;
    // Remove user from all checkpoints
    Object.keys(state.checkpoint.version).forEach((version) => {
      delete state.checkpoint.version[version].activeUsers[userId];
    });
    // Remove user from active users
    delete state.activeUsers[userId];

    // Remove active user caret from DOM
    state.el.removeActiveUserCaret(userId);
    return state;
  }

  /**
  * fromJSON parses JSON string into a UserLeave instance.
  * Parameters:
  *   json: string
  * Returns: UserLeave
  */
  static fromJSON(json) {
    const { type, data } = WSMessage.fromJSON(json);
    if (type !== UserLeave.type) {
      throw WSMessage.invalidData('Invalid UserLeave Format');
    }

    const missingProps = WSMessage.checkDataProps(data, UserLeave.props);
    if (missingProps.length > 0) {
      throw WSMessage.invalidData(
        `Sync message missing required properties: ${missingProps.join(', ')}`,
      );
    }

    return new UserLeave(data.userId);
  }
}

UserLeave.type = 5;
UserLeave.props = Object.freeze(['userId']);

export default UserLeave;
