// WebSocket message constants
const msgTypes = Object.freeze({
  Init: 0,
  Update: 1,
  Ack: 2,
  Sync: 3,
  UserJoin: 4,
  UserLeave: 5,
});
const updateTypes = Object.freeze({
  Edit: 0,
  Cursor: 1,
});
const initialProps = Object.freeze(['content', 'version']);
const editProps = Object.freeze(['type', 'userId', 'delta', 'version', 'patch']);
const cursorProps = Object.freeze(['type', 'userId', 'delta', 'version']);
const ackProps = Object.freeze(['version']);
const syncProps = Object.freeze(['version']);
const userActionProps = Object.freeze(['userId']);

const userColours = Object.freeze([
  'light-blue',
  'dark-blue',
  'pink',
  'salmon',
  'red',
  'mustard',
  'light-orange',
  'dark-orange',
  'light-green',
  'dark-green',
  'olive',
  'seafoam',
  'light-purple',
  'dark-purple',
]);

// WebSocket error codes
const GOING_AWAY = 4001;
const INVALID_PAYLOAD_DATA = 4007;
const INTERNAL_ERROR = 4011;

export {
  msgTypes,
  updateTypes,
  initialProps,
  editProps,
  cursorProps,
  ackProps,
  syncProps,
  userActionProps,
  userColours,
  GOING_AWAY,
  INVALID_PAYLOAD_DATA,
  INTERNAL_ERROR,
};
