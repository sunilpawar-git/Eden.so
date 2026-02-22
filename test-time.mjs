const serverTimestamp = () => ({ _methodName: "serverTimestamp" });

function removeUndefined(obj) {
    return Object.fromEntries(
        Object.entries(obj)
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [
                k,
                typeof v === 'object' && v && !Array.isArray(v) && !(v instanceof Date)
                    ? removeUndefined(v)
                    : v,
            ])
    );
}

class FieldValue {
    constructor() { this.type = "serverTimestamp"; }
}
const timestamp = new FieldValue();

const obj = { ts: timestamp };
console.log("Before:", obj, "instanceof FieldValue:", obj.ts instanceof FieldValue);
const newObj = removeUndefined(obj);
console.log("After:", newObj, "instanceof FieldValue:", newObj.ts instanceof FieldValue);
