import Caret from './caret';

class DOMElement {
  /**
  * Creates a new DOMElement instance.
  * Parameters:
  *   el: DOM Element
  */
  constructor(el) {
    this.el = el;
  }

  isActive() {
    const doc = this.el.ownerDocument || this.el.document;
    return doc.activeElement === this.el;
  }

  /**
  * innerHTML gets the innerHTML of the DOM element.
  * Parameters:
  *   content: string
  */
  get innerHTML() {
    return this.el.innerHTML;
  }

  /**
  * setInnerHTML sets the innerHTML of the DOM element.
  * Parameters:
  *   content: string
  */
  setInnerHTML(content) {
    this.el.innerHTML = content;
  }

  /**
  * getCaretPosition gets the caret position relative to the text in the DOM
  * element.
  * Returns: Caret
  */
  getCaretPosition() {
    let start = 0;
    let end = 0;
    const doc = this.el.ownerDocument || this.el.document;
    const win = doc.defaultView || doc.parentWindow;
    let sel;
    if (win.getSelection !== undefined) {
      sel = win.getSelection();
      if (sel.rangeCount > 0) {
        const range = win.getSelection().getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(this.el);
        preCaretRange.setEnd(range.startContainer, range.startOffset);
        start = preCaretRange.toString().length;
        preCaretRange.selectNodeContents(this.el);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        end = preCaretRange.toString().length;
      }
    }
    return new Caret(start, end);
  }

  /**
  * getAllTextNodes gets all of the nodes within the DOM Element that contain
  * text.
  * Returns: Node[]
  */
  getAllTextNodes() {
    const a = [];
    const walk = document.createTreeWalker(this.el, NodeFilter.SHOW_TEXT, null, false);
    let n = walk.nextNode();
    while (n) {
      a.push(n);
      n = walk.nextNode();
    }
    return a;
  }

  /**
  * getTextSize gets the total size of only the text nodes in the DOM Element.
  * Returns: int, total size of text nodes
  */
  getTextSize() {
    const range = document.createRange();
    range.selectNodeContents(this.el);
    return range.toString().length;
  }

  /**
  * getCaretData determines the node and offset of the given position within the
  * DOM Element.
  * Parameters:
  *   position: int
  * Returns: object{node, offset}, where node is the Node that the position is
  *           in and offset is the position within the element
  */
  getCaretData(position) {
    let node;
    let offset = position;
    const nodes = this.getAllTextNodes(this.el);

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
  }

  /**
  * setCaret sets the client's caret at a specified position in the DOM element.
  * Parameters:
  *   position: Caret
  */
  setCaret(position) {
    const doc = this.el.ownerDocument || this.el.document;
    const win = doc.defaultView || doc.parentWindow;
    const sel = win.getSelection();
    const range = doc.createRange();

    const { start, end } = position;
    const startData = this.getCaretData(start);
    const endData = this.getCaretData(end);
    if (!startData.node) {
      startData.node = this.el;
    }
    if (!endData.node) {
      endData.node = this.el;
    }
    range.setStart(startData.node, startData.offset);
    if (startData.node === endData.node && startData.offset === endData.offset) {
      range.collapse(true);
    } else {
      range.setEnd(endData.node, endData.offset);
    }

    sel.removeAllRanges();
    sel.addRange(range);
  }

  /**
  * removeHighlight removes a "highlight" span from around text nodes.
  * Parameters:
  *   highlight, DOM Element: the "highlight" span with children
  */
  removeHighlight(highlight) {
    const doc = this.el.ownerDocument || this.el.document;
    const highlightRange = doc.createRange();
    highlightRange.selectNodeContents(highlight);
    highlight.parentNode.insertBefore(highlightRange.extractContents(), highlight);
    highlight.parentNode.removeChild(highlight);
  }

  /**
  * removeAllHighlights removes all "highlight" spans from around text nodes
  * inside the DOM element.
  */
  removeAllHighlights() {
    const highlights = this.el.querySelectorAll('span.highlight');
    highlights.forEach((highlight) => {
      this.removeHighlight(highlight);
    });
  }

  /**
  * setActiveUserCaret modifies the DOM to display a representation of the
  * active user's caret.
  * Parameters:
  *   position: Caret
  *   id, int: the active user's id
  *   colour, string: the colour to use for the caret
  */
  setActiveUserCaret(position, id, colour) {
    const { parentNode } = this.el;
    let cursor = parentNode.querySelector(`#cursor-${id}`);
    if (!cursor) {
      cursor = document.createElement('span');
      cursor.setAttribute('id', `cursor-${id}`);
      cursor.setAttribute('class', 'cursor');
      cursor.setAttribute('style', `background-color: var(--${colour});`);
    } else {
      cursor = cursor.parentNode.removeChild(cursor);
    }

    const { start, end } = position;

    const startData = this.getCaretData(start);
    if (!startData.node) {
      startData.node = this.el;
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

    let highlight = this.el.querySelector(`#highlight-${id}`);
    if (!highlight) {
      highlight = document.createElement('span');
      highlight.setAttribute('id', `highlight-${id}`);
      highlight.setAttribute('class', 'highlight');
      highlight.setAttribute('style', `background-color: var(--highlight-${colour});`);
    } else {
      this.removeHighlight(highlight);
    }

    if (start !== end) {
      const endData = this.getCaretData(end);
      if (!endData.node) {
        endData.node = this.el;
      }
      range.setEnd(endData.node, endData.offset);

      range.surroundContents(highlight);
    }
  }

  /**
  * removeActiveUserCaret removes the representation of the active user's caret
  * from the DOM.
  * Parameters:
  *   id, int: the active user's id
  */
  removeActiveUserCaret(id) {
    const cursor = this.el.parentNode.querySelector(`#cursor-${id}`);
    if (cursor) {
      cursor.parentNode.removeChild(cursor);
    }
    const highlight = this.el.querySelector(`#highlight-${id}`);
    if (highlight) {
      this.el.removeHighlight(highlight);
    }
  }
}

export default DOMElement;