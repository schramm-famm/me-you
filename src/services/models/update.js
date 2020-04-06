import WSMessage from './wsmessage';
import Sync from './sync';
import Delta from './delta';
import Checkpoint from './checkpoint';

class Update extends WSMessage {
  /**
  * Creates a new Update instance.
  * Parameters:
  *   type: int
  *   delta: Delta
  *   version: int
  *   patch: string
  *   userId: int
  */
  constructor(type, delta, version, patch, userId) {
    const data = { type, delta, version };
    if (patch) {
      data.patch = patch;
    }
    if (userId) {
      data.userId = userId;
    }
    super(WSMessage.types.Update, data);
  }

  /**
  * handleEdit modifies the state according to the Edit Update. Processes the
  * patch in the message and shifts the client's and active users' carets
  * accordingly.
  * Required Parameters:
  *   state: object
  *     state.content: string
  *     state.activeUsers: object, int -> ActiveUser
  *     state.checkpoint: object
  *       state.checkpoint.latest: int
  *       state.checkpoint.content: string
  *       state.checkpoint.version: object, int -> Checkpoint
  */
  handleEdit(state) {
    const {
      userId,
      version,
      delta,
      patch,
    } = this.data;

    // Remove highlights from the DOM so they don't affect the patch
    state.el.removeAllHighlights();

    const msgPatch = state.dmp.patch_fromText(patch);

    [state.content] = state.dmp.patch_apply(msgPatch, state.checkpoint.content);
    state.checkpoint.content = state.content;

    const { latest } = state.checkpoint;
    const { activeUsers } = state.checkpoint.version[latest];
    let { selfCaret } = state.checkpoint.version[latest];
    const senderCaret = activeUsers[userId];
    // newCheckpoint is the new version checkpoint once this update is processed
    const newCheckpoint = new Checkpoint(
      selfCaret,
      activeUsers,
      senderCaret,
      delta,
    );

    // Shift client checkpoint caret
    if (selfCaret) {
      newCheckpoint.selfCaret.shiftCaret(senderCaret, delta);
      selfCaret = newCheckpoint.selfCaret.copy();
    }

    // Shift active users' checkpoint carets
    Object.entries(newCheckpoint.activeUsers).forEach(([user, caret]) => {
      const newCaret = caret;
      if (user === userId.toString(10)) {
        // Apply delta to sender caret
        newCaret.start += delta.caretStart;
        newCaret.end += delta.caretEnd;
      } else {
        newCaret.shiftCaret(senderCaret, delta);
      }
      newCheckpoint.activeUsers[user] = newCaret.copy();
      state.activeUsers[user].caret = newCaret.copy();
    });

    // Add new version checkpoint
    state.checkpoint.version[version] = newCheckpoint;
    state.checkpoint.latest = version;

    if (version <= state.version) {
      // Version conflict occurred, so patches in patchBuffer need to be replayed
      // on top
      let i = 0;

      while (i < state.patchBuffer.length) {
        const { delta: bufDelta, patchStr } = state.patchBuffer[i];
        const bufPatch = state.dmp.patch_fromText(patchStr);
        const [content, results] = state.dmp.patch_apply(bufPatch, state.content);

        if (!results[0]) {
          // Remove failed patch from patchBuffer
          state.patchBuffer.splice(i, 1);
          state.version -= 1;
        } else {
          state.content = content;
          // Shift displayed active users' carets with the client's caret as the
          // sender
          Object.values(state.activeUsers).forEach(({ caret }) => {
            caret.shiftCaret(selfCaret, bufDelta);
          });
          selfCaret.start += bufDelta.caretStart;
          selfCaret.end += bufDelta.caretEnd;
          i += 1;
        }
      }
    } else if (version > state.version + 1) {
      const errMsg = `Server version greater than expected: ${version} > ${state.version + 1}`;
      throw WSMessage.invalidData(errMsg);
    }

    // Send a Sync message to indicate that this version has been processed
    // successfully
    const sync = new Sync(version);
    sync.send(state.ws);

    state.version += 1;
    state.el.setInnerHTML(state.content);
    state.textSize += delta.doc;

    // Set the client's caret in the DOM
    state.caret = selfCaret;
    state.el.setCaret(state.caret);

    // Set the active users' carts in the DOM
    Object.values(state.activeUsers).forEach((activeUser) => {
      state.el.setActiveUserCaret(activeUser);
    });

    return state;
  }

  /**
  * handleCaret modifies the state according to the Caret Update. Applies the
  * delta to the sender's caret at the specified version and shifts its caret at
  * subsequent versions accordingly.
  * Required Parameters:
  *   state: object
  *     state.checkpoint: object
  *       state.checkpoint.latest: int
  *       state.checkpoint.content: string
  *       state.checkpoint.version: object, int -> object
  *         state.checkpoint.version[version].activeUsers: object, int -> Caret
  *         state.checkpoint.version[version].senderCaret: Caret
  *         state.checkpoint.version[version].delta: delta
  */
  handleCaret(state) {
    const {
      delta,
      version,
      userId,
    } = this.data;

    // Update user's checkpoint caret
    const msgCheckpoint = state.checkpoint.version[version];
    msgCheckpoint.activeUsers[userId].start += delta.caretStart;
    msgCheckpoint.activeUsers[userId].end += delta.caretEnd;

    const { latest } = state.checkpoint;
    for (let v = version + 1; v <= latest; v += 1) {
      const currCheckpoint = state.checkpoint.version[v];
      const prevCheckpoint = state.checkpoint.version[v - 1];
      currCheckpoint.activeUsers[userId] = prevCheckpoint.activeUsers[userId].copy();

      // Shift caret using position at previous checkpoint and the sender and
      // delta at the current checkpoint
      currCheckpoint.activeUsers[userId].shiftCaret(
        currCheckpoint.senderCaret,
        currCheckpoint.delta,
      );
    }

    // Update user's caret using patchBuffer
    const { activeUsers } = state.checkpoint.version[latest];
    const selfCaret = state.checkpoint.version[latest].selfCaret.copy();

    state.activeUsers[userId].caret = activeUsers[userId].copy();

    state.patchBuffer.forEach(({ delta: bufDelta }) => {
      state.activeUsers[userId].caret.shiftCaret(selfCaret, bufDelta);
      selfCaret.start += delta.caretStart;
      selfCaret.end += delta.caretEnd;
    });

    state.el.setActiveUserCaret(state.activeUsers[userId]);

    return state;
  }

  /**
  * handle modifies the state according to the Update message. Calls the proper
  * function based on the subtype of the Update.
  * Required Parameters:
  *   state: object
  *     state.checkpoint: object
  *       state.checkpoint.latest: int
  *       state.checkpoint.content: string
  *       state.checkpoint.version: object, int -> object
  *         state.checkpoint.version[version].activeUsers: object, int -> Caret
  *         state.checkpoint.version[version].senderCaret: Caret
  *         state.checkpoint.version[version].delta: delta
  */
  handle(state) {
    const { userId, type } = this.data;
    if (!(userId in state.activeUsers)) {
      const errMsg = `Message sender (user ${userId}) not active in conversation`;
      throw WSMessage.invalidData(errMsg);
    }

    switch (type) {
      case Update.types.Edit: {
        return this.handleEdit(state);
      }
      case Update.types.Caret: {
        return this.handleCaret(state);
      }
      default:
        throw WSMessage.invalidData(`Invalid update type: ${type}`);
    }
  }

  /**
  * validType checks if the provided type is a valid WebSocket Update message
  * type.
  * Parameters:
  *   type: int
  * Returns: bool
  */
  static validType(type) {
    return type in Object.values(Update.types);
  }

  /**
  * fromJSON parses JSON string into an Update instance.
  * Parameters:
  *   json: string
  * Returns: Update
  */
  static fromJSON(json) {
    const { type, data } = WSMessage.fromJSON(json);
    if (type !== Update.type || !Update.validType(data.type)) {
      throw WSMessage.invalidData('Invalid Update Format');
    }

    let requiredProps = Update.caretProps;
    if (data.type === Update.types.Edit) {
      requiredProps = Update.editProps;
    }

    const missingProps = WSMessage.checkDataProps(data, requiredProps);
    if (missingProps.length > 0) {
      throw WSMessage.invalidData(
        `Update message missing required properties: ${missingProps.join(', ')}`,
      );
    }

    const delta = new Delta(
      data.delta.caretStart,
      data.delta.caretEnd,
      data.delta.doc,
    );

    return new Update(data.type, delta, data.version, data.patch, data.userId);
  }
}

Update.type = 1;
Update.types = Object.freeze({
  Edit: 0,
  Caret: 1,
});

Update.editProps = Object.freeze(['type', 'userId', 'delta', 'version', 'patch']);
Update.caretProps = Object.freeze(['type', 'userId', 'delta', 'version']);

export default Update;
