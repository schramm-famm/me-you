/*
  Gets the current position of the caret.
  Parameters:
    el, DOM Element: the element that the caret is in
  Returns: int, the position of the caret
*/
const getCaretPosition = (el) => {
  let start = 0;
  let end = 0;
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  let sel;
  if (win.getSelection !== undefined) {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      const range = win.getSelection().getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(el);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      start = preCaretRange.toString().length;
      preCaretRange.selectNodeContents(el);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      end = preCaretRange.toString().length;
    }
  }
  return { start, end };
};

/*
  Gets all of the nodes within the given DOM Element that contain text.
  Parameters:
    el, DOM Element: the element to traverse
  Returns: Node[], list of all text nodes within el
*/
const getAllTextNodes = (el) => {
  const a = [];
  const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
  let n = walk.nextNode();
  while (n) {
    a.push(n);
    n = walk.nextNode();
  }
  return a;
};

/*
  Gets the total size of only the text nodes in the given DOM Element
  Parameters:
    el, DOM Element: the element to traverse
  Returns: int, total size of text nodes
*/
const getTextSize = (el) => {
  const range = document.createRange();
  range.selectNodeContents(el);
  return range.toString().length;
};

/*
  Determines the node and offset within the node of the given position.
  Parameters:
    el, DOM Element: the element that contains the caret
    position, int: the desired position
  Returns:  Object{node, offset}, where node is the Node that the position is
            in and offset is the position within the element
*/
const getCaretData = (el, position) => {
  let node;
  let offset = position;
  const nodes = getAllTextNodes(el);

  for (let n = 0; n < nodes.length; n += 1) {
    if (offset > nodes[n].nodeValue.length && nodes[n + 1]) {
      // remove amount from the position, go to next node
      offset -= nodes[n].nodeValue.length;
    } else {
      node = nodes[n];
      break;
    }
  }

  return { node, offset };
};

/*
  Sets the caret position.
  Parameters:
    el, DOM Element: the element that contains the Node
    position, int: the desired position
*/
const setCaretPosition = (el, { start, end }) => {
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  const sel = win.getSelection();
  const range = doc.createRange();

  const startData = getCaretData(el, start);
  const endData = getCaretData(el, end);
  if (!startData.node) {
    startData.node = el;
  }
  if (!endData.node) {
    endData.node = el;
  }
  range.setStart(startData.node, startData.offset);
  if (startData.node === endData.node && startData.offset === endData.offset) {
    range.collapse(true);
  } else {
    range.setEnd(endData.node, endData.offset);
  }

  sel.removeAllRanges();
  sel.addRange(range);
};

const removeHighlight = (highlight) => {
  const highlightRange = document.createRange();
  highlightRange.selectNodeContents(highlight);
  highlight.parentNode.insertBefore(highlightRange.extractContents(), highlight);
  highlight.parentNode.removeChild(highlight);
};

const removeAllHighlights = (el) => {
  const highlights = el.querySelectorAll('span.highlight');
  highlights.forEach((highlight) => {
    removeHighlight(highlight);
  });
};

/*
  Sets the active user's displayed caret position.
  Parameters:
    el, DOM Element: the element that contains the Node
    position, int: the desired position
    id, int: the active user's id
    colour, string: the colour to use for the caret
*/
const setActiveUserCaretPosition = (el, { start, end }, id, colour) => {
  const { parentNode } = el;
  let cursor = parentNode.querySelector(`#cursor-${id}`);
  if (!cursor) {
    cursor = document.createElement('span');
    cursor.setAttribute('id', `cursor-${id}`);
    cursor.setAttribute('class', 'cursor');
    cursor.setAttribute('style', `background-color: var(--${colour});`);
  } else {
    cursor = cursor.parentNode.removeChild(cursor);
  }

  const startData = getCaretData(el, start);
  if (!startData.node) {
    startData.node = el;
  }
  const range = document.createRange();
  range.setStart(startData.node, startData.offset);
  const startY = range.getBoundingClientRect().top;
  const startX = range.getBoundingClientRect().left;

  if (startY === 0 && startX === 0) {
    parentNode.style.position = 'relative';
    cursor.style.top = '1em';
    cursor.style.left = '1em';
  } else {
    parentNode.style.position = 'static';
    cursor.style.top = `${startY}px`;
    cursor.style.left = `${startX}px`;
  }

  parentNode.append(cursor);

  let highlight = el.querySelector(`#highlight-${id}`);
  if (!highlight) {
    highlight = document.createElement('span');
    highlight.setAttribute('id', `highlight-${id}`);
    highlight.setAttribute('class', 'highlight');
    highlight.setAttribute('style', `background-color: var(--highlight-${colour});`);
  } else {
    removeHighlight(highlight);
  }

  if (start !== end) {
    const endData = getCaretData(el, end);
    if (!endData.node) {
      endData.node = el;
    }
    range.setEnd(endData.node, endData.offset);

    range.surroundContents(highlight);
  }
};

export {
  getTextSize,
  getCaretPosition,
  setCaretPosition,
  removeHighlight,
  removeAllHighlights,
  setActiveUserCaretPosition,
};
