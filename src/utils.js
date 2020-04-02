const debugLog = (msg) => {
  if (process.env.VUE_APP_DEBUG === 'true') {
    console.log(msg);
  }
};

/*
  Checks if the object has the required properties.
  Parameters:
    obj, Object: the object to be checked
    requiredProps, string[]: the required properties for the object
  Returns: string[], the properties that are missing
*/
const checkProps = (obj, requiredProps) => {
  const missingProps = [];
  requiredProps.forEach((prop) => {
    if (!(prop in obj)) {
      missingProps.push(prop);
    }
  });

  return missingProps;
};

const isArray = (a) => Array.isArray(a);

const isObject = (o) => (
  o === Object(o) && !isArray(o) && typeof o !== 'function'
);

const toCamel = (s) => s.replace(
  /([_][a-z])/ig,
  ($1) => $1.toUpperCase().replace('_', ''),
);

const keysToCamel = (o) => {
  if (isObject(o)) {
    const n = {};

    Object.keys(o)
      .forEach((k) => {
        n[toCamel(k)] = keysToCamel(o[k]);
      });

    return n;
  }
  if (isArray(o)) {
    return o.map((i) => keysToCamel(i));
  }

  return o;
};

/**
 * Returns the Authorization header with the JWT token
 */
const authHeader = () => {
  const token = localStorage.getItem('token');

  if (token) {
    return { Authorization: `Bearer ${token}` };
  }

  return {};
};

export {
  debugLog,
  checkProps,
  keysToCamel,
  authHeader,
};
