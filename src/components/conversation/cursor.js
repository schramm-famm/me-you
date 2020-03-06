/*
  Gets the current position of the caret.
  Parameters:
    el, DOM Element: the element that the caret is in
  Returns: int, the position of the caret
*/
const getCaretPosition = (el) => {
  let caretOffset = 0;
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  let sel;
  if (win.getSelection !== undefined) {
    sel = win.getSelection();
    if (sel.rangeCount > 0) {
      const range = win.getSelection().getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(el);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      caretOffset = preCaretRange.toString().length;
    }
  } else if (sel === doc.selection && sel.type !== 'Control') {
    const textRange = sel.createRange();
    const preCaretTextRange = doc.body.createTextRange();
    preCaretTextRange.moveToElementText(el);
    preCaretTextRange.setEndPoint('EndToEnd', textRange);
    caretOffset = preCaretTextRange.text.length;
  }
  return caretOffset;
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
    d, Object{node, offset}: where node is the Node that contains the caret and
      offset is the position within the Node
    el, DOM Element: the element that contains the Node
    position, int: the desired position
*/
const setCaretPosition = (d, el) => {
  const doc = el.ownerDocument || el.document;
  const win = doc.defaultView || doc.parentWindow;
  const sel = win.getSelection();
  const range = doc.createRange();
  range.setStart(d.node, d.offset);
  range.collapse(true);
  sel.removeAllRanges();
  sel.addRange(range);
};

export {
  getCaretPosition,
  getCaretData,
  setCaretPosition,
};
