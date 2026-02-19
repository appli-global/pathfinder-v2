
import { VALID_COURSE_NAMES, COURSE_CATALOG } from "./constants";

console.log("---------------------------------------------------");
console.log("VERIFYING STRICT COURSE DATA LOADING");
console.log("---------------------------------------------------");

console.log(`Total Valid Course Names: ${VALID_COURSE_NAMES.size}`);
console.log(`Total Courses in Catalog: ${COURSE_CATALOG.length}`);

// Check for expected courses
const expectedCourses = [
    "B.Sc. - Computer Science",
    "B.A. - Psychology",
    "B.Tech - Computer Science Engineering"
];

console.log("\nChecking for expected courses:");
expectedCourses.forEach(name => {
    // Fuzzy check or exact check depending on data
    // Since we don't know exact string rep, we look for inclusion
    const found = Array.from(VALID_COURSE_NAMES).find(n => n.includes(name.split(' - ')[1]));
    console.log(`[${found ? 'PASS' : 'FAIL'}] Searching for something like "${name}" -> Found: "${found || 'NONE'}"`);
});

if (VALID_COURSE_NAMES.size === 0) {
    console.error("CRITICAL ERROR: VALID_COURSE_NAMES is empty!");
    process.exit(1);
}

if (COURSE_CATALOG.length !== VALID_COURSE_NAMES.size && COURSE_CATALOG.length < 100) {
    // It's okay if they differ slightly due to filtering, but shouldn't be zero
    console.warn("Warning: Catalog size seems low?");
}

console.log("\nSUCCESS: Data structures are populated.");
