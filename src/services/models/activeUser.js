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
    this.caret = caret.copy();
    this.colour = colour;
  }

  /**
  * copy returns a new ActiveUser instance with the current instance's
  * properties' values.
  * Returns: ActiveUser
  */
  copy() {
    return new ActiveUser(this.id, this.caret, this.colour);
  }

  /**
  * addTo creates and adds an ActiveUser to a state.
  * Returns: ActiveUser
  */
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

    state.el.setActiveUserCaret(state.activeUsers[id]);
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
