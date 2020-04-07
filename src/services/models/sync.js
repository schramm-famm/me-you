import WSMessage from './wsmessage';

class Sync extends WSMessage {
  /**
  * Creates a new Sync instance.
  * Parameters:
  *   version: int
  */
  constructor(version) {
    const data = { version };
    super(WSMessage.types.Sync, data);
  }

  /**
  * handle modifies the state according to the Sync message. Deletes the version
  * checkpoint preceding the specified version.
  * Required Parameters:
  *   state: object
  *     state.checkpoint: object
  *       state.checkpoint.version: object, int -> Checkpoint
  */
  handle(state) {
    const { version } = this.data;
    if (!(version - 1 in state.checkpoint.version)) {
      const errMsg = `Version ${version - 1} does not exist in checkpoints`;
      throw WSMessage.invalidData(errMsg);
    }

    delete state.checkpoint.version[version - 1];
    return state;
  }

  /**
  * fromJSON parses JSON string into a Sync instance.
  * Parameters:
  *   json: string
  * Returns: Sync
  */
  static fromJSON(json) {
    const { type, data } = WSMessage.fromJSON(json);
    if (type !== Sync.type) {
      throw WSMessage.invalidData('Invalid Sync Format');
    }

    const missingProps = WSMessage.checkDataProps(data, Sync.props);
    if (missingProps.length > 0) {
      throw WSMessage.invalidData(
        `Sync message missing required properties: ${missingProps.join(', ')}`,
      );
    }

    return new Sync(data.version);
  }
}

Sync.type = 3;
Sync.props = Object.freeze(['version']);

export default Sync;
