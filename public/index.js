// const element = {
//   type: 'h1',
//   props: {
//     title: 'foo',
//     children: 'Hello',
//   },
// }

// const container = document.getElementById('root')

// if (!container) {
//   throw new Error('Container not found')
// }

// const node = document.createElement(element.type)
// node['title'] = element.props.title

// const text = document.createTextNode('')
// text['nodeValue'] = element.props.children

// node.appendChild(text)
// container.appendChild(node)

function createTextElement(text) {
  return {
    type: 'TEXT_ELEMENT',
    props: {
      nodeValue: text,
      children: []
    }
  };
}
function createElement(type, props, ...children) {
  return {
    type,
    props: {
      ...props,
      children: children.map(child => typeof child === 'object' ? child : createTextElement(child))
    }
  };
}
function createDom(fiber) {
  const dom = fiber.type == 'TEXT_ELEMENT' ? document.createTextNode('') : document.createElement(fiber.type);
  updateDom(dom, {}, fiber.props);
  return dom;
}
let nextUnitOfWork = null;
// reference to the last fiber tree committed to the DOM
let currentRoot = null;
let wipRoot = null;
let deletions = null;
const isEvent = key => key.startsWith('on');
const isProperty = key => key !== 'children' && !isEvent(key);
const isNew = (prev, next) => key => prev[key] !== next[key];
const isGone = (prev, next) => key => !(key in next);
function updateDom(dom, prevProps, nextProps) {
  // Remove old or changed event listeners
  Object.keys(prevProps).filter(isEvent).filter(key => !(key in nextProps) || isNew(prevProps, nextProps)(key)).forEach(name => {
    const eventType = name.toLowerCase().substring(2);
    dom.removeEventListener(eventType, prevProps[name]);
  });

  // Remove old properties
  Object.keys(prevProps).filter(isProperty).filter(isGone(prevProps, nextProps)).forEach(name => {
    dom[name] = '';
  });

  // Set new or changed properties
  Object.keys(nextProps).filter(isProperty).filter(isNew(prevProps, nextProps)).forEach(name => {
    dom[name] = nextProps[name];
  });

  // Add new event listeners
  Object.keys(nextProps).filter(isEvent).filter(isNew(prevProps, nextProps)).forEach(name => {
    const eventType = name.toLowerCase().substring(2);
    dom.addEventListener(eventType, nextProps[name]);
  });
}
function commitWork(fiber) {
  if (!fiber) {
    return;
  }
  const domParent = fiber.parent.dom;
  if (fiber.effectTag === 'PLACEMENT' && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === 'UPDATE' && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTag === 'DELETION') {
    domParent.removeChild(fiber.dom);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
function commitRoot() {
  deletions.forEach(commitWork);
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}
function render(element, container) {
  wipRoot = {
    dom: container,
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}

// Here we will reconcile the old fibers with the new elements
function reconcileChildren(wipFiber, elements) {
  let index = 0;
  let oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  let prevSibling = null;
  while (index < elements.length || oldFiber != null) {
    // The element is the thing we want to render to the DOM
    // and the oldFiber is what we rendered the last time
    const element = elements[index];
    let newFiber = null;

    // We need to compare them
    // to see if there’s any change we need to apply to the DOM
    const sameType = oldFiber && element && element.type == oldFiber.type;

    // Here React also uses keys, that makes a better reconciliation
    // For example, it detects when children change places in the element array

    // if the old fiber and the new element have the same type,
    // we can keep the DOM node and just update it with the new props
    if (sameType) {
      // update the node
      newFiber = {
        type: oldFiber.type,
        props: element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: 'UPDATE'
      };
    }
    // if the type is different and there is a new element,
    // it means we need to create a new DOM node
    if (element && !sameType) {
      // add this node
      newFiber = {
        type: element.type,
        props: element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: 'PLACEMENT'
      };
    }
    // and if the types are different and there is an old fiber,
    // we need to remove the old node
    if (oldFiber && !sameType) {
      // delete the oldFiber's node
      oldFiber.effectTag = 'DELETION';
      deletions.push(oldFiber);
    }
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    if (index === 0) {
      wipFiber.child = newFiber;
    } else if (element) {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}
function performUnitOfWork(fiber) {
  if (!fiber.dom) {
    fiber.dom = createDom(fiber);
  }
  const elements = fiber.props.children;
  reconcileChildren(fiber, elements);
  if (fiber.child) {
    return fiber.child;
  }
  let nextFiber = fiber;
  while (nextFiber) {
    if (nextFiber.sibling) {
      return nextFiber.sibling;
    }
    nextFiber = nextFiber.parent;
  }
}
function workLoop(deadline) {
  let shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    commitRoot();
  }
  requestIdleCallback(workLoop);
}
requestIdleCallback(workLoop);
const ww = {
  createElement,
  render
};

// const element = ww.createElement(
//   'div',
//   { id: 'foo' },
//   ww.createElement('a', null, 'bar'),
//   ww.createElement('b')
// )
// console.dir(ww.createElement('div', null, element), { depth: null })

// /** @jsx ww.createElement */
// const element = (
//   <div style='background: aqua'>
//     <h1>Hello World</h1>
//     <h1>Hello World</h1>
//     <h1>Hello World</h1>
//     <h1>Hello World</h1>
//     <h1>Hello World</h1>
//     <h1>Hello World</h1>
//   </div>
// )
/** @jsx ww.createElement */
const container = document.getElementById('root');
// ww.render(element, container)

const updateValue = e => {
  rerender(e.target.value);
};
const rerender = value => {
  const element = ww.createElement("div", null, ww.createElement("input", {
    onInput: updateValue,
    value: value
  }), ww.createElement("h2", null, "Hello ", value));
  ww.render(element, container);
};
rerender('World');
