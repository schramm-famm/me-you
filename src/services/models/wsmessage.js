import WSException from './wsexception';
import utils from '../utils';

class WSMessage {
  /**
  * Creates a new WSMessage instance.
  * Parameters:
  *   type: int
  *   data: object
  */
  constructor(type, data) {
    this.type = type;
    this.data = data;
  }

  /**
  * toString returns a string representation of the class.
  * Returns: string
  */
  toString() {
    return JSON.stringify({
      type: this.type,
      data: utils.formatKeys(this.data, utils.toSnake),
    });
  }

  /**
  * send sends the WSMessage to the provided WebSocket connection.
  * Parameters:
  *   ws: WebSocket
  */
  send(ws) {
    console.log(this);
    ws.send(this.toString());
  }

  /**
  * invalidData returns a WSException to throw with the provided message and an
  * INVALID_PAYLOAD_DATA error code.
  * Parameters:
  *   msg: string
  * Returns: WSException
  */
  static invalidData(msg) {
    return new WSException(msg, WSException.INVALID_PAYLOAD_DATA);
  }

  /**
  * validType checks if the provided type is a valid WebSocket message type.
  * Parameters:
  *   type: int
  * Returns: bool
  */
  static validType(type) {
    return type in Object.values(WSMessage.types);
  }

  /**
  * validUpdateType checks if the provided type is a valid WebSocket Update
  * message type.
  * Parameters:
  *   type: int
  * Returns: bool
  */
  static validUpdateType(type) {
    return type in Object.values(WSMessage.updateTypes);
  }

  /**
  * checkDataProps returns the required properties that the payload data is
  * missing.
  * Parameters:
  *   data: object
  *   requiredProps: []string
  * Returns: []string
  */
  static checkDataProps(data, requiredProps) {
    const missingProps = [];
    requiredProps.forEach((prop) => {
      if (!(prop in data)) {
        missingProps.push(prop);
      }
    });
    return missingProps;
  }

  /**
  * fromJSON parses JSON string into a WSMessage instance.
  * Parameters:
  *   json: string
  * Returns: WSMessage
  */
  static fromJSON(json) {
    const { type, data } = JSON.parse(json);
    if (!WSMessage.validType(type) || !data) {
      throw WSMessage.invalidData('Invalid message format');
    }
    return new WSMessage(type, utils.formatKeys(data, utils.toCamel));
  }
}

WSMessage.types = Object.freeze({
  Init: 0,
  Update: 1,
  Ack: 2,
  Sync: 3,
  UserJoin: 4,
  UserLeave: 5,
});

export default WSMessage;
