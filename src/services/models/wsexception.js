class WSException {
  constructor(msg, code) {
    this.msg = msg;
    this.code = code;
  }
}

WSException.GOING_AWAY = 4001;
WSException.INVALID_PAYLOAD_DATA = 4007;
WSException.INTERNAL_ERROR = 4011;

export default WSException;
