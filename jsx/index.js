const { parse: parseHTML } = require('node-html-parser');

const filterTaggedNodes = nodes => nodes.filter(node => node.tagName);

const stringToStyleObject = (string = "") => {
  let copyString = string;
  const propMatcher = /(\w+)(:)/gm;
  let match = propMatcher.exec(string);
  while (match) {
    copyString = copyString.replace(match[1], `"${match[1]}"`);
    match = propMatcher.exec(string);
  }
  return copyString.replace(/'/g, '"');
};

const separateStyleObjectFromAttrs = rawAttrs => {
  const styleMatcher = /style\=\{(.*)\}/gm;
  let match = styleMatcher.exec(rawAttrs);
  if (match) {
    return {
      rawAttrs: rawAttrs.replace(match[0], ''),
      styleObject: JSON.parse(stringToStyleObject(match[1]))
    };
  }
  return {
    rawAttrs,
    styleObject: {}
  };
};

const separateEventTypesFromAttributes = rawAttrs => {
  const eventTypes = rawAttrs.split(' ').filter(key => key.match(/on[A-Z]/));
  return {
    eventTypes,
    parsedAttributes: rawAttrs.split(' ').filter(k => k && !eventTypes.includes(k))
  };
};

const constructPropsFromRawAttrs = (rawAttrs = '') => {
  const attributeMatcher = /(\w+)=("(.*?)")/gm;
  let match = attributeMatcher.exec(rawAttrs);
  const props = {};
  while (match) {
    const [_, key, __, value] = match;
    props[key] = value;
    match = attributeMatcher.exec(rawAttrs);
  }
  return props;
};

const constructNodeList = elements => {
  return elements.map(element => {
    console.log(Object.keys(element), element);
    if (element._rawText) {
      return element._rawText;
    }
    const { attributes = {}, childNodes = [], rawAttrs = '', rawTagName } = element;
    const { key } = attributes;

    // Check if style attribute is not object
    if (rawAttrs.includes('style="')) {
      throw new Error('"style" property must be used as an object');
    } 

    const { styleObject: style, rawAttrs: parsedRawAttrs } = separateStyleObjectFromAttrs(rawAttrs);

    const { eventTypes, parsedAttributes } = separateEventTypesFromAttributes(parsedRawAttrs);
    const props = constructPropsFromRawAttrs(parsedAttributes);
    if (!rawTagName) {
      throw new Error('Tag name is required!');
    }
    if (!key) {
      throw new Error('"key" attribute is required!');
    }

    return {
      key,
      elementType: rawTagName,
      props: {
        style: style || {},
        ...props
      },
      eventTypes,
      children: constructNodeList(childNodes)
    };
  });
};

function JSXParser(node) {
  const nodeList = constructNodeList(filterTaggedNodes(parseHTML(node).childNodes));
  return JSON.stringify(nodeList);
}

module.exports = JSXParser;
