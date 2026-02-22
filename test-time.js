import { serverTimestamp } from 'firebase/firestore';

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

const obj = { ts: serverTimestamp() };
console.log("Before:", obj);
const newObj = removeUndefined(obj);
console.log("After:", newObj);
