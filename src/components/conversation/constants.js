// WebSocket message constants
const msgTypes = Object.freeze({
  Init: 0,
  Update: 1,
  Ack: 2,
  UserJoin: 3,
  UserLeave: 4,
});
const updateTypes = Object.freeze({
  Edit: 0,
  Cursor: 1,
});
const initialProps = Object.freeze(['content', 'version']);
const editProps = Object.freeze(['type', 'user_id', 'cursor_delta', 'version', 'patch']);
const cursorProps = Object.freeze(['type', 'user_id', 'cursor_delta']);
const ackProps = Object.freeze(['version']);
const userActionProps = Object.freeze(['user_id']);

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

// Key values
const ARROW_DOWN = 'ArrowDown';
const ARROW_LEFT = 'ArrowLeft';
const ARROW_RIGHT = 'ArrowRight';
const ARROW_UP = 'ArrowUp';
const END = 'End';
const HOME = 'Home';
const PAGE_DOWN = 'PageDown';
const PAGE_UP = 'PageUp';

export {
  msgTypes,
  updateTypes,
  initialProps,
  editProps,
  cursorProps,
  ackProps,
  userActionProps,
  userColours,
  GOING_AWAY,
  INVALID_PAYLOAD_DATA,
  INTERNAL_ERROR,
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_UP,
  END,
  HOME,
  PAGE_DOWN,
  PAGE_UP,
};
