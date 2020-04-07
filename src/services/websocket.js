import utils from './utils';
import * as models from './models';

const connect = (id) => Promise.resolve(new WebSocket(
  `wss://${utils.backend}/patches/v1/connect/${id}`,
));

const parseMessage = (json) => {
  const msg = JSON.parse(json);
  switch (msg.type) {
    case models.Init.type:
      return models.Init.fromJSON(json);
    case models.Update.type:
      return models.Update.fromJSON(json);
    case models.Ack.type:
      return models.Ack.fromJSON(json);
    case models.Sync.type:
      return models.Sync.fromJSON(json);
    case models.UserJoin.type:
      return models.UserJoin.fromJSON(json);
    case models.UserLeave.type:
      return models.UserLeave.fromJSON(json);
    default:
      throw models.WSMessage.invalidData('Invalid message type');
  }
};

export default {
  connect,
  parseMessage,
};
