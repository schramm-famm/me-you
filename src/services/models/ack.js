/* eslint class-methods-use-this: ["error", { "exceptMethods": ["handle"] }] */
import WSMessage from './wsmessage';
import WSException from './wsexception';
import Checkpoint from './checkpoint';

class Ack extends WSMessage {
  /**
  * Creates a new Ack instance.
  * Parameters:
  *   version: int
  */
  constructor(version) {
    const data = { version };
    super(WSMessage.types.Ack, data);
  }

  /**
  * handle modifies the state according to the Ack message. Creates a new
  * checkpoint for the version that was acknowledged using the earliest patch in
  * the patchBuffer.
  * Required Parameters:
  *   state: object
  *     state.checkpoint: object
  *       state.checkpoint.version: object, int -> Checkpoint
  */
  handle(state) {
    if (state.patchBuffer.length <= 0) {
      const errMsg = 'No patches awaiting acknowledgement';
      throw new WSException(errMsg, WSMessage.INTERNAL_ERROR);
    }

    // Dequeue the patch and delta from the patchBuffer
    const [{ patchStr, delta }] = state.patchBuffer.splice(0, 1);
    const patch = state.dmp.patch_fromText(patchStr);
    const [content, ok] = state.dmp.patch_apply(patch, state.checkpoint.content);
    if (!ok) {
      const errMsg = 'Failed to apply acknowledged patch';
      throw new WSException(errMsg, WSMessage.INTERNAL_ERROR);
    }
    state.checkpoint.content = content;

    // Get the client's caret position at the latest checkpoint
    const { latest } = state.checkpoint;
    const { selfCaret: prevCaret } = state.checkpoint.version[latest];
    const newCheckpoint = new Checkpoint(
      prevCaret,
      state.checkpoint.version[latest].activeUsers,
      prevCaret,
      delta,
    );

    // Apply delta to client's caret at new checkpoint
    newCheckpoint.selfCaret.start += delta.caretStart;
    newCheckpoint.selfCaret.end += delta.caretEnd;

    // Shift active users' carets at new checkpoint
    Object.values(newCheckpoint.activeUsers).forEach((caret) => {
      caret.shiftCaret(prevCaret, delta);
    });

    state.checkpoint.version[latest + 1] = newCheckpoint;
    state.checkpoint.latest += 1;

    return state;
  }

  /**
  * fromJSON parses JSON string into an Ack instance.
  * Parameters:
  *   json: string
  * Returns: Ack
  */
  static fromJSON(json) {
    const { type, data } = WSMessage.fromJSON(json);
    if (type !== Ack.type) {
      throw WSMessage.invalidData('Invalid Ack Format');
    }

    const missingProps = WSMessage.checkDataProps(data, Ack.props);
    if (missingProps.length > 0) {
      throw WSMessage.invalidData(
        `Sync message missing required properties: ${missingProps.join(', ')}`,
      );
    }

    return new Ack(data.version);
  }
}

Ack.type = 2;
Ack.props = Object.freeze(['version']);

export default Ack;
