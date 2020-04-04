const randomInd = (list) => Math.floor(Math.random() * Math.floor(list.length));

class ActiveUser {
  /**
  * Creates a new ActiveUser instance.
  * Parameters:
  *   id: int
  *   caret: Caret
  *   colour: string
  */
  constructor(id, caret, colour) {
    this.id = id;
    this.caret = caret;
    this.colour = colour;
  }

  setDOM(el) {
    el.setActiveUserCaret(this.caret, this.id, this.colour);
  }

  static addTo(state, id, caret) {
    const { latest, version } = state.checkpoint;

    const colourInd = randomInd(state.colourList);

    version[latest].activeUsers[id] = caret;
    state.activeUsers[id] = new ActiveUser(
      id,
      caret,
      state.colourList[colourInd],
    );

    state.colourList.splice(colourInd, 1);

    if (state.colourList.length === 0) {
      state.colourList = [...ActiveUser.colours];
    }

    state.activeUsers[id].setDOM(state.el);
  }
}

ActiveUser.colours = Object.freeze([
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

export default ActiveUser;
