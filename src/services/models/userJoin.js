import WSMessage from './wsmessage';
import ActiveUser from './activeUser';
import Caret from './caret';

class UserJoin extends WSMessage {
  /**
  * Creates a new UserJoin instance.
  * Parameters:
  *   userId: int
  */
  constructor(userId) {
    const data = { userId };
    super(WSMessage.types.UserJoin, data);
  }

  /**
  * handle adds a new active user to the state specified by the UserJoin.
  * Required Parameters:
  *   state: object
  *     state.el: DOMElement
  *     state.activeUsers: object, int -> ActiveUser
  *     state.colourList: []string
  *     state.checkpoint: object
  *       state.checkpoint.latest: int
  *       state.checkpoint.content: string
  *       state.checkpoint.version: object, int -> Checkpoint
  */
  handle(state) {
    ActiveUser.addTo(state, this.data.userId, new Caret(0, 0));
    return state;
  }

  /**
  * fromJSON parses JSON string into a UserJoin instance.
  * Parameters:
  *   json: string
  * Returns: UserJoin
  */
  static fromJSON(json) {
    const { type, data } = WSMessage.fromJSON(json);
    if (type !== UserJoin.type) {
      throw WSMessage.invalidData('Invalid UserJoin Format');
    }

    const missingProps = WSMessage.checkDataProps(data, UserJoin.props);
    if (missingProps.length > 0) {
      throw WSMessage.invalidData(
        `Sync message missing required properties: ${missingProps.join(', ')}`,
      );
    }

    return new UserJoin(data.userId);
  }
}

UserJoin.type = 4;
UserJoin.props = Object.freeze(['userId']);

export default UserJoin;
