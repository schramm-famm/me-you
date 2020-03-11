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

export { debugLog, checkProps };
