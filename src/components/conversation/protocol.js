import { INVALID_PAYLOAD_DATA, INTERNAL_ERROR } from './constants';

/* WebSocket exception objects */
function InvalidDataException(msg) {
  this.message = msg;
  this.code = INVALID_PAYLOAD_DATA;
}

function RestartConnectionException(msg) {
  this.message = msg;
  this.code = INVALID_PAYLOAD_DATA;
}

function FailedAckException(msg) {
  this.message = msg;
  this.code = INTERNAL_ERROR;
}

/* WebSocket message objects */
function Message(type, msgData) {
  this.type = type;
  this.data = msgData;
}

function Sync(version) {
  this.version = version;
}

function Update(type, delta, version, patch) {
  this.type = type;
  this.delta = delta;
  if (version !== undefined) {
    this.version = version;
  }
  if (patch !== undefined) {
    this.patch = patch;
  }
}

function Delta(caretStart, caretEnd, doc) {
  this.caret_start = caretStart;
  this.caret_end = caretEnd;
  if (doc !== undefined) {
    this.doc = doc;
  }
}

function Caret(start, end) {
  this.start = start;
  this.end = end;
}

/* Internal objects */
function VersionCheckpoint(selfCaret, activeUsers, senderCaret, delta) {
  this.selfCaret = { ...selfCaret };
  this.activeUsers = { ...activeUsers };
  this.senderCaret = { ...senderCaret };
  this.delta = { ...delta };
}

function Patch(patchStr, delta) {
  this.patchStr = patchStr;
  this.delta = { ...delta };
}

/* Caret shifting algorithm */

const processAdd = (receiverCaret, senderCaret, delta) => {
  const newReceiverCaret = receiverCaret;
  if (senderCaret.end < receiverCaret.end) {
    newReceiverCaret.end += delta;
    if (senderCaret.end <= receiverCaret.start) {
      newReceiverCaret.start += delta;
    }
  }
  return newReceiverCaret;
};

const shiftCaret = (receiverCaret, senderCaret, delta) => {
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
    return processAdd(receiverCaret, senderCaret, delta.doc);
  }

  const rangeDelta = range.start - range.end;
  console.log(range);
  const newReceiverCaret = {};

  Object.assign(newReceiverCaret, receiverCaret);

  if (range.end < receiverCaret.end) {
    newReceiverCaret.end += rangeDelta;
    if (range.end <= receiverCaret.start) {
      newReceiverCaret.start += rangeDelta;
    } else if (range.start < receiverCaret.start) {
      newReceiverCaret.start = range.start;
    }
  } else if (range.end === receiverCaret.end) {
    newReceiverCaret.start = range.end + rangeDelta;
    newReceiverCaret.end = range.end + rangeDelta;
  } else if (range.start < receiverCaret.end) {
    newReceiverCaret.end = range.start;
    if (range.start < receiverCaret.start) {
      newReceiverCaret.start = range.start;
    }
  }

  if (delta.caretStart > 0) {
    const tmpSenderCaret = {
      start: senderCaret.start,
      end: senderCaret.start,
    };
    return processAdd(newReceiverCaret, tmpSenderCaret, delta.caretStart);
  }
  return newReceiverCaret;
};

export {
  InvalidDataException,
  RestartConnectionException,
  FailedAckException,
  Message,
  Sync,
  Update,
  Delta,
  Caret,
  Patch,
  VersionCheckpoint,
  shiftCaret,
};
