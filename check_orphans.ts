
import { ALL_COURSES, COURSE_CATALOG, MASTERS_CATALOG } from "./constants";

console.log(`Total Parsed: ${ALL_COURSES.length}`);
console.log(`UG Catalog: ${COURSE_CATALOG.length}`);
console.log(`PG Catalog: ${MASTERS_CATALOG.length}`);

const covered = new Set([...COURSE_CATALOG.map(c => c.id), ...MASTERS_CATALOG.map(c => c.id)]);
const orphans = ALL_COURSES.filter(c => !covered.has(c.id));

console.log(`Orphans: ${orphans.length}`);
if (orphans.length > 0) {
    console.log("Sample Orphans:");
    orphans.slice(0, 5).forEach(c => console.log(`- [${c.category}] ${c.name}`));
}
