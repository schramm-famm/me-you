import WSMessage from './wsmessage';
import Checkpoint from './checkpoint';
import ActiveUser from './activeUser';
import Caret from './caret';

class Init extends WSMessage {
  /**
  * Creates a new Init instance.
  * Parameters:
  *   content: string
  *   version: int
  *   activeUsers: object
  */
  constructor(content, version, activeUsers) {
    const data = { content, version };
    if (activeUsers) {
      data.activeUsers = activeUsers;
    }
    super(WSMessage.types.Init, data);
  }

  /**
  * handle initializes the state according to the Init message.
  * Required Parameters:
  *   state: object
  *     state.activeUsers: object, int -> ActiveUser
  *     state.colourList: []string
  *     state.content: string
  *     state.version: int
  *     state.el: DOMElement
  *     state.textSize: int
  *     state.checkpoint: object
  *       state.checkpoint.latest: int
  *       state.checkpoint.content: string
  *       state.checkpoint.version: object, int -> Checkpoint
  */
  handle(state) {
    const { version, content, activeUsers } = this.data;
    state.version = version;
    state.content = content;
    state.checkpoint.content = state.content;
    state.checkpoint.latest = state.version;
    state.caret = new Caret(0, 0);
    state.checkpoint.version[state.version] = new Checkpoint(state.caret, {});
    if (state.content === '') {
      state.content = '<div></div';
    }
    state.el.setInnerHTML(state.content);
    state.textSize = state.el.getTextSize();

    if (activeUsers !== undefined) {
      Object.entries(activeUsers).forEach(([user, { start, end }]) => {
        ActiveUser.addTo(state, user, new Caret(start, end));
      });
    }

    return state;
  }

  /**
  * fromJSON parses JSON string into an Init instance.
  * Parameters:
  *   json: string
  * Returns: Init
  */
  static fromJSON(json) {
    const { type, data } = WSMessage.fromJSON(json);
    if (type !== Init.type) {
      throw WSMessage.invalidData('Invalid Init Format');
    }

    const missingProps = WSMessage.checkDataProps(data, Init.props);
    if (missingProps.length > 0) {
      throw WSMessage.invalidData(
        `Init message missing required properties: ${missingProps.join(', ')}`,
      );
    }

    return new Init(data.content, data.version, data.activeUsers);
  }
}

Init.type = 0;
Init.props = Object.freeze(['content', 'version']);

export default Init;
